const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please enter an event title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please enter an event description'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please select an event category'],
      enum: {
        values: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar'],
        message: '{VALUE} is not a valid event category',
      },
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event organizer is required'],
    },
    venue: {
      type: String,
      required: [true, 'Please specify an event venue'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Please specify the event date'],
    },
    startTime: {
      type: String,
      required: [true, 'Please specify event start time'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'Please specify event end time'],
      trim: true,
    },
    targetDepartments: {
      type: [String],
      default: ['All'],
    },
    maxSeats: {
      type: Number,
      required: [true, 'Please enter maximum seats / registration limit'],
      min: [1, 'Maximum seats must be at least 1'],
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'Registered count cannot be negative'],
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    resultsSummary: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias for registrationLimit (maps to maxSeats)
eventSchema
  .virtual('registrationLimit')
  .get(function () {
    return this.maxSeats;
  })
  .set(function (val) {
    this.maxSeats = val;
  });

// Virtual alias for eligibility (maps to targetDepartments)
eventSchema
  .virtual('eligibility')
  .get(function () {
    return this.targetDepartments;
  })
  .set(function (val) {
    this.targetDepartments = Array.isArray(val) ? val : [val];
  });

// Virtual alias for image (maps to bannerUrl)
eventSchema
  .virtual('image')
  .get(function () {
    return this.bannerUrl;
  })
  .set(function (val) {
    this.bannerUrl = val;
  });

// Virtual helper for formatted schedule string
eventSchema.virtual('schedule').get(function () {
  return `${this.startTime} - ${this.endTime}`;
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
