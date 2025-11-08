// backend/services/notificationService.js (New File)

const Notification = require('../models/Notification');

/**
 * Helper function to create a new notification.
 */
const createNotification = async ({ user, request, type, title, message }) => {
    try {
        // Validate required fields
        if (!user || !request || !type || !title || !message) {
            throw new Error('Missing required notification fields');
        }
        
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
        // Re-throw to allow caller to handle
        throw error;
    }
};

module.exports = {
  createNotification
};