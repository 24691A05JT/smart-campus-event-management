const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: [true, 'Certificate ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student user reference is required'],
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    pdfPath: {
      type: String,
      default: '',
    },
    certificateUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness for a student and event
certificateSchema.index({ student: 1, event: 1 }, { unique: true });

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
