// backend/services/notificationService.js (New File)

const Notification = require('../models/Notification');

/**
 * Helper function to create a new notification.
 */
const createNotification = async ({ user, request, type, title, message }) => {
    try {
        const notification = new Notification({
            user,
            project: request, 
            type,
            title,
            message,
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};

module.exports = {
  createNotification
};