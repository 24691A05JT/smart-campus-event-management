const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');

/**
 * Generate personalized content-based event recommendations for a student.
 * @param {Object} user - Authenticated student user object from req.user
 * @returns {Array} Array of recommendation items { event, score, reason }
 */
const getPersonalizedRecommendations = async (user) => {
  if (!user || user.role !== 'student') {
    return [];
  }

  // 1. Fetch student's existing active registrations
  const studentRegistrations = await Registration.find({
    student: user._id,
    status: 'registered',
  }).populate('event', 'category');

  const registeredEventIds = new Set(
    studentRegistrations
      .filter((r) => r.event && r.event._id)
      .map((r) => r.event._id.toString())
  );

  // Categories of events student previously registered for
  const pastCategories = new Set(
    studentRegistrations
      .filter((r) => r.event && r.event.category)
      .map((r) => r.event.category.toLowerCase())
  );

  // 2. Fetch student's submitted feedbacks
  const studentFeedbacks = await Feedback.find({
    student: user._id,
  }).populate('event', 'category');

  // Categories of events student rated >= 4
  const highRatedCategories = new Set(
    studentFeedbacks
      .filter((f) => f.rating >= 4 && f.event && f.event.category)
      .map((f) => f.event.category.toLowerCase())
  );

  // 3. Fetch all approved upcoming events
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const approvedEvents = await Event.find({
    status: 'approved',
    date: { $gte: today },
  }).populate('organizer', 'name email department');

  const studentDept = (user.department || '').toLowerCase().trim();
  const studentInterests = (user.interests || []).map((i) => i.toLowerCase().trim());

  // 4. Score each eligible event
  const scoredEvents = [];

  for (const event of approvedEvents) {
    const eventIdStr = event._id.toString();

    // Rule: Do not recommend events the student has already registered for
    if (registeredEventIds.has(eventIdStr)) {
      continue;
    }

    let score = 0;
    const reasons = [];

    const eventCategory = (event.category || '').toLowerCase().trim();
    const targetDepts = Array.isArray(event.targetDepartments)
      ? event.targetDepartments.map((d) => d.toLowerCase().trim())
      : [];

    // Component 1: Department Match (+30 points)
    const isDeptMatch =
      targetDepts.length === 0 ||
      targetDepts.includes('all') ||
      (studentDept && targetDepts.includes(studentDept));

    if (isDeptMatch) {
      score += 30;
      reasons.push(`matches your department (${user.department || 'General'})`);
    }

    // Component 2: Interest / Category Match (+30 points)
    const isInterestMatch = studentInterests.some(
      (interest) =>
        interest === eventCategory ||
        eventCategory.includes(interest) ||
        interest.includes(eventCategory)
    );

    if (isInterestMatch) {
      score += 30;
      reasons.push(`aligns with your interests (${event.category})`);
    }

    // Component 3: Previous Event Participation (+20 points)
    if (pastCategories.has(eventCategory)) {
      score += 20;
      reasons.push(`matches your past activity in ${event.category} events`);
    }

    // Component 4: High Rating Preference (+10 points)
    if (highRatedCategories.has(eventCategory)) {
      score += 10;
      reasons.push(`matches event categories you rated highly`);
    }

    // Component 5: Event Popularity (+10 points)
    const maxSeats = Number(event.maxSeats || 50);
    const regCount = Number(event.registeredCount || 0);
    if (regCount > 0 && maxSeats > 0) {
      const fillRatio = regCount / maxSeats;
      const popularityScore = Math.min(10, Math.max(2, Math.round(fillRatio * 10)));
      score += popularityScore;
      if (fillRatio >= 0.3) {
        reasons.push('popular among campus peers');
      }
    }

    // Cap maximum total score at 100
    const finalScore = Math.min(100, score);

    // Build explainable recommendation reason sentence
    let reasonSentence = '';
    if (reasons.length > 0) {
      reasonSentence = `Recommended because it ${reasons.join(' and ')}.`;
    } else {
      reasonSentence = 'Recommended for general campus engagement and participation.';
    }

    scoredEvents.push({
      event,
      score: finalScore,
      reason: reasonSentence,
    });
  }

  // 5. Sort by score descending
  scoredEvents.sort((a, b) => b.score - a.score);

  // 6. Return top 5 recommendations
  return scoredEvents.slice(0, 5);
};

module.exports = {
  getPersonalizedRecommendations,
};
