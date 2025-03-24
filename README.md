# twobrainsdata

# TwoBrains.ai Mixpanel Analytics

A robust, production-ready Mixpanel implementation for tracking user behavior in the TwoBrains.ai decision-making application.

## Overview

This package provides a comprehensive solution for tracking user interactions throughout the TwoBrains.ai application. It includes type-safe event tracking, reliable initialization, and helper functions for common tracking scenarios.

## Features

- **Reliable Initialization**: Robust retry logic with exponential backoff to ensure Mixpanel initializes correctly
- **Event Queueing**: Prevents event loss if tracking occurs before initialization completes
- **Type-Safe Tracking**: Full TypeScript definitions for all events and properties
- **Error Handling**: Comprehensive error catching and fallbacks
- **Debug Mode**: Detailed console logging for troubleshooting
- **Event Categorization**: Events organized by functional areas

## Implementation

### Step 1: Install Dependency

```bash
npm install mixpanel-browser
# or
yarn add mixpanel-browser
```

### Step 2: Add File to Your Project

1. Create a file at `src/utils/mixpanel.ts`
2. Copy the entire contents of the "Complete Mixpanel Implementation for Direct Integration" file (`final-mixpanel-implementation.ts`) into this new file

### Step 3: Initialize Mixpanel

Add this to your main application component:

```typescript
import { initMixpanel, SessionEvents } from './utils/mixpanel';

function App() {
  useEffect(() => {
    // Initialize with your Mixpanel token
    initMixpanel("YOUR_MIXPANEL_TOKEN", true); // Set second parameter to false in stable production
    
    // Track session start
    const userType = localStorage.getItem('user_id') ? 'Authenticated' : 'Guest';
    SessionEvents.trackSessionStart(userType);
    
    // Track session end
    const startTime = Date.now();
    const handleUnload = () => {
      SessionEvents.trackSessionEnd(startTime, window.history.length);
    };
    window.addEventListener('beforeunload', handleUnload);
    
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
  
  return (
    // Your app content
  );
}
```

## Usage Examples

### Track Decision Events

```typescript
import { DecisionEvents } from './utils/mixpanel';

// When a user starts a decision process
DecisionEvents.trackDiscussionStart('beef-vs-pork');

// When a decision is completed
DecisionEvents.trackDecisionComplete('beef-vs-pork', startTime, true);

// When a user views the summary
DecisionEvents.trackSummaryView('analysis');
```

### Track AI Interactions

```typescript
import { AIEvents } from './utils/mixpanel';

// When a user interacts with an AI
AIEvents.trackAIInteraction('Moderator', 'analyze', responseTime);

// When a user clicks on an AI response
AIEvents.trackClickedResponse('Moderator', 2);

// When pros and cons are generated
AIEvents.trackProsAndConsGenerated(['Claude', 'Gemini'], elapsedTime);
```

### Track Feedback

```typescript
import { FeedbackEvents } from './utils/mixpanel';

// When a user clicks the feedback button
FeedbackEvents.trackFeedbackButtonClicked();

// When a user submits feedback
FeedbackEvents.trackFeedbackSubmission('Great app, very helpful!');
```

## Available Events

### Session Events
- **SessionStarted**: When a user begins a new session
- **SessionEnded**: When a user ends their session
- **TimeBetweenSessions**: Time interval between consecutive sessions

### Decision Flow Events
- **DiscussionStarted**: When a user starts a new decision process
- **ProsAndConsGenerated**: When pros and cons are generated
- **DecisionCompleted**: When a user completes a decision
- **AbandonedDiscussion**: When a user abandons a decision
- **OpenedSummaryView**: When a user views the summary screen
- **UserLeftAppMidway**: When a user leaves before completing

### AI Interaction Events
- **AIInteracted**: When a user interacts with an AI model
- **ClickedAIResponse**: When a user clicks on an AI-provided suggestion

### Feedback Events
- **FeedbackButtonClicked**: When a user clicks the feedback button
- **FeedbackSubmitted**: When a user submits feedback

## Advanced Usage

### Custom Event Tracking

For events not covered by the helper functions, use the `trackEvent` function directly:

```typescript
import { trackEvent } from './utils/mixpanel';

trackEvent('CustomEvent', {
  property1: 'value1',
  property2: 'value2'
});
```

### User Identification

Identify users to associate events with specific users:

```typescript
import { identifyUser } from './utils/mixpanel';

// When a user logs in
identifyUser(userId, {
  email: userEmail,
  name: userName
});
```

### Reset User Identity

Reset the user identity when a user logs out:

```typescript
import { resetUser } from './utils/mixpanel';

// When a user logs out
resetUser();
```

## Debugging

When initializing Mixpanel, set the debug parameter to `true` to see detailed logs:

```typescript
initMixpanel(MIXPANEL_TOKEN, true); // Enable debug mode
```

This will output detailed logs to help diagnose any issues:
- Initialization attempts and success/failure
- Event tracking details
- Error messages with stack traces

## Troubleshooting

### Events Not Showing in Mixpanel

1. Check console for errors (initialize with debug mode)
2. Verify your Mixpanel token is correct
3. Ensure network requests to api.mixpanel.com are not blocked
4. Try disabling any ad blockers or privacy extensions

### Initialization Failures

If Mixpanel fails to initialize after multiple attempts:
1. Check browser console for specific error messages
2. Verify the Mixpanel token is valid
3. Ensure your firewall or security settings allow connections to Mixpanel

## Mixpanel Dashboard Tips

For optimal analysis in Mixpanel:

1. **Create Funnels** to track user progress through the decision flow:
   - DiscussionStarted → ProsAndConsGenerated → DecisionCompleted

2. **Use Cohort Analysis** to understand user retention:
   - Group users by their first session date
   - Track how often they return to the application

3. **Set Up Custom Events Views** based on event categories:
   - Decision Flow events
   - AI Interaction events
   - Feedback events

## Contact

For questions or support, please contact the development team.
