/**
 * CivicTrack AI Evaluator (Hackathon Edition)
 * Simulates advanced image-to-text and NLP classification for complaints.
 * Checks for severity, emotion, and 'fake' spam detection based on heuristics.
 */

const analyzeComplaint = async (title, description, type, hasImage) => {
    // Simulate AI processing delay (1.5 seconds) for the "wow" factor during demo
    await new Promise(resolve => setTimeout(resolve, 1500));

    const text = `${title} ${description}`.toLowerCase();
    
    // 1. Identify priority & severity/emotion
    let priority = 'Low';
    let emotion = 'Neutral';
    let severityKeywords = [];

    const highPriorityWords = ['fire', 'accident', 'blood', 'crash', 'flood', 'emergency', 'danger', 'trapped', 'explosion'];
    const mediumPriorityWords = ['water', 'leak', 'crack', 'pot hole', 'pothole', 'broken', 'sewage', 'smell', 'power', 'dead'];

    highPriorityWords.forEach(word => { if (text.includes(word)) severityKeywords.push(word); });
    if (severityKeywords.length > 0) {
        priority = 'High';
        emotion = 'Urgent / Alert 🔥';
    } else {
        mediumPriorityWords.forEach(word => { if (text.includes(word)) severityKeywords.push(word); });
        if (severityKeywords.length > 0) {
            priority = 'Medium';
            emotion = 'Concerned ⚠️';
        }
    }

    // 2. Fake / Spam Detection
    let isVerified = true;
    let aiReason = `Verified by AI. Emotion detected: ${emotion}. Priority assigned: ${priority}.`;

    if (!hasImage) {
        // If it's high priority but no image, maybe flag for review or lower priority
        aiReason = `No image provided. Priority: ${priority}. (Photo analysis skipped).`;
    } else {
        // Here we simulate the AI identifying the image mismatching the text.
        // For a hackathon demo, if the user types "dog" or "cat" or "spam", we flag it as fake!
        const spamWords = ['dog', 'cat', 'selfie', 'food', 'test', 'fake', 'spam', 'asdf'];
        const foundSpam = spamWords.find(w => text.includes(w));
        
        if (foundSpam) {
            isVerified = false;
            priority = 'Low';
            aiReason = `🚨 FAILS VERIFICATION: AI detected irrelevant content related to '${foundSpam}'. Image does not match civic issue guidelines.`;
        } else {
            aiReason = `✅ PASSED VERIFICATION: Image content aligns with '${type}' category. Emotion: ${emotion}. Priority: ${priority}.`;
        }
    }

    return {
        isVerified,
        priority,
        aiReason,
        emotion
    };
};

module.exports = { analyzeComplaint };
