const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

/**
 * Creates an in-app notification for a user and optionally sends an email if configured.
 *
 * @param {Object} options
 * @param {string} options.userId - Recipient user ID
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message body
 * @param {string} [options.type='general'] - Type ('registration', 'event_approval', 'event_rejection', 'attendance', 'certificate', 'general')
 * @param {string} [options.link=''] - Optional target URL/link
 * @param {string} [options.recipientEmail] - Optional email address to dispatch email
 * @returns {Promise<Object|null>} Created notification document
 */
const createNotification = async ({ userId, title, message, type = 'general', link = '', recipientEmail = null }) => {
  try {
    // Prevent immediate duplicate unread notification with identical title, user, and type within last 1 minute
    const recentDuplicate = await Notification.findOne({
      user: userId,
      type,
      title,
      isRead: false,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });

    let notification;
    if (recentDuplicate) {
      notification = recentDuplicate;
    } else {
      notification = await Notification.create({
        user: userId,
        title,
        message,
        type,
        link,
      });
    }

    // Optional email dispatch if email service is configured
    if (recipientEmail && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      sendEmailNotification({
        to: recipientEmail,
        subject: `[Smart Campus] ${title}`,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0;">${title}</h2>
            <p style="font-size: 15px; line-height: 1.6;">${message}</p>
            <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">Smart Campus Event & Activity Management System</p>
          </div>
        `,
      }).catch((emailErr) => {
        console.warn('Optional email notification error (non-fatal):', emailErr.message);
      });
    }

    return notification;
  } catch (error) {
    if (error.message && error.message.includes('buffering timed out')) {
      return null;
    }
    console.warn('Notification service handled error:', error.message);
    return null;
  }
};

/**
 * Sends an email using Nodemailer. Safely fails without throwing to caller if unconfigured or errant.
 */
const sendEmailNotification = async ({ to, subject, text, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Smart Campus System" <no-reply@smartcampus.edu>',
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.warn('Nodemailer send failed:', error.message);
  }
};

module.exports = {
  createNotification,
  sendEmailNotification,
};
