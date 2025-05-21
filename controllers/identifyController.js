import pool from '../db/db.js';
import { extractUnique } from '../utils/helpers.js';

export const identify = async (req, res) => {

  console.log("Received request at /identify:", req.body);

  const { email, phoneNumber } = req.body;
  if (!email && !phoneNumber) return res.status(400).json({ error: "email and phone number both required" });

  const connection = await pool.getConnection();
  try {
    // Checking for any existing contacts with the same email or phone number
    const [existingContacts] = await connection.query(
      `SELECT * FROM Contact WHERE email = ? OR phoneNumber = ?`,
      [email, phoneNumber]
    );

    let primaryContact = null;
    const allRelatedContacts = new Map();

    // Gather all related contacts by iterating
    const queue = [...existingContacts];
    while (queue.length) {
      const contact = queue.pop();

      // Avoiding revisiting the same contact
      if (!allRelatedContacts.has(contact.id)) {
        allRelatedContacts.set(contact.id, contact);

        // If contact is linked to another, fetch all contacts sharing the same linkedId
        if (contact.linkedId) {
          const [linked] = await connection.query(`SELECT * FROM Contact WHERE id = ? OR linkedId = ?`, [contact.linkedId, contact.linkedId]);
          queue.push(...linked);
        }
      }
    }

    const contactsArray = Array.from(allRelatedContacts.values());

    // Deciding the primary contact either one with 'primary' linkPrecedence, or the oldest  contact (by createdAt) if no one is primary
    const primary = contactsArray.find(c => c.linkPrecedence === 'primary')
                  || contactsArray.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];

    primaryContact = primary;

    // Collecting all unique emails and phone numbers from related contacts

    const emails = extractUnique([primaryContact.email, ...contactsArray.map(c => c.email)]);
    const phones = extractUnique([primaryContact.phoneNumber, ...contactsArray.map(c => c.phoneNumber)]);
    const secondaryIds = contactsArray.filter(c => c.id !== primaryContact.id).map(c => c.id);

    // If this (email, phoneNumber) pair is new, insert this to db as a secondary contact
    const isExisting = contactsArray.some(c => c.email === email && c.phoneNumber === phoneNumber);
    if (!isExisting) {
      await connection.query(
        `INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence) VALUES (?, ?, ?, ?)`,
        [phoneNumber, email, primaryContact.id, 'secondary']
      );
    }
    console.log("Received request at /identify:", req.body);
    res.status(200).json({
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers: phones,
        secondaryContactIds: secondaryIds
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
    console.log("Error Stack:", error.stack);
  } finally {
    connection.release();
  }
};
