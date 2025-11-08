const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  type: {
    type: String,
    enum: [
      'assignment', 
      'response',
      'design_review',       // <-- NEW: Designer to Admin submission
      'design_approved',     // <-- NEW: Admin to Client approval
      'client_acceptance',   // <-- NEW: Client to Designer acceptance
      'project_completed'    // <-- NEW: Client acceptance (used for Admin notification)
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
