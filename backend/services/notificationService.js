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
        
        // Check for duplicate notification (same user, project, type, title, and message within last 5 minutes)
        // Include message in duplicate check to allow progress updates with different percentages
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingNotification = await Notification.findOne({
            user,
            project: request,
            type,
            title,
            message, // Include message to distinguish progress updates with different percentages
            createdAt: { $gte: fiveMinutesAgo }
        });
        
        if (existingNotification) {
            console.log('Duplicate notification prevented:', { user, request, type, title, message: message.substring(0, 50) });
            return existingNotification;
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