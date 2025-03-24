// src/utils/mixpanel.ts
// COPY AND PASTE THIS ENTIRE FILE INTO YOUR PROJECT

import mixpanel from 'mixpanel-browser';

/**
 * Event Categories for better organization
 */
export enum EventCategory {
  USER_ENGAGEMENT = 'User Engagement',
  DECISION_FLOW = 'Decision Flow',
  AI_INTERACTION = 'AI Interaction',
  FEEDBACK = 'Feedback',
  SESSION = 'Session'
}

/**
 * Complete type definitions for all Mixpanel events
 */
export interface MixpanelEventPayloads {
  // SESSION EVENTS
  SessionStarted: {
    timestamp: string;
    user_type: string;
    platform: string;
  };
  SessionEnded: {
    duration: number;
    pages_visited: number;
  };
  TimeBetweenSessions: {
    interval_in_minutes: number;
  };
  
  // DECISION FLOW EVENTS
  DiscussionStarted: {
    decision_type: string;
    timestamp: string;
  };
  ProsAndConsGenerated: {
    models_used: string[];
    elapsed_time: number;
  };
  DecisionCompleted: {
    decision_type: string;
    completion_time: number;
    was_helpful: boolean;
  };
  AbandonedDiscussion: {
    inactivity_duration: number;
    current_step: string;
  };
  OpenedSummaryView: {
    from_step: string;
  };
  UserLeftAppMidway: {
    screen: string;
  };
  
  // AI INTERACTION EVENTS
  AIInteracted: {
    model: string;
    action_type: string;
    response_time: number;
  };
  ClickedAIResponse: {
    model: string;
    position: number;
  };
  
  // FEEDBACK EVENTS
  FeedbackButtonClicked: Record<string, never>;
  FeedbackSubmitted: {
    feedback_text: string;
  };
}

/**
 * Map of event names to their categories
 */
export const EVENT_CATEGORIES: Record<keyof MixpanelEventPayloads, EventCategory> = {
  SessionStarted: EventCategory.SESSION,
  SessionEnded: EventCategory.SESSION,
  TimeBetweenSessions: EventCategory.SESSION,
  DiscussionStarted: EventCategory.DECISION_FLOW,
  ProsAndConsGenerated: EventCategory.DECISION_FLOW,
  DecisionCompleted: EventCategory.DECISION_FLOW,
  AbandonedDiscussion: EventCategory.DECISION_FLOW,
  OpenedSummaryView: EventCategory.DECISION_FLOW,
  UserLeftAppMidway: EventCategory.DECISION_FLOW,
  AIInteracted: EventCategory.AI_INTERACTION,
  ClickedAIResponse: EventCategory.AI_INTERACTION,
  FeedbackButtonClicked: EventCategory.FEEDBACK,
  FeedbackSubmitted: EventCategory.FEEDBACK
};

// For logging all Mixpanel operations in console
let mixpanelDebugMode = false;

// Track if Mixpanel is successfully initialized
let mixpanelInitialized = false;

// Backup queue for failed events (when Mixpanel initialization fails)
const eventBackupQueue: Array<{name: string, props: any}> = [];
const MAX_QUEUE_SIZE = 50; // Limit queue to prevent memory issues

/**
 * Attempt to flush any backed up events
 */
const flushEventQueue = () => {
  if (!mixpanelInitialized || eventBackupQueue.length === 0) return;
  
  if (mixpanelDebugMode) {
    console.log(`Flushing ${eventBackupQueue.length} backed up events`);
  }
  
  while (eventBackupQueue.length > 0) {
    const event = eventBackupQueue.shift();
    if (event) {
      try {
        mixpanel.track(event.name, event.props);
      } catch (error) {
        console.error(`Failed to flush event ${event.name}`, error);
      }
    }
  }
};

/**
 * Initialize Mixpanel with robust retry logic
 * @param token - Mixpanel project token
 * @param debug - Enable debug mode (logs to console)
 */
export const initMixpanel = (token: string, debug = false): void => {
  mixpanelDebugMode = debug;
  let retries = 0;
  const MAX_RETRIES = 3;
  
  const initialize = () => {
    try {
      if (mixpanelDebugMode) {
        console.log(`Initializing Mixpanel (attempt ${retries + 1})`);
      }
      
      mixpanel.init(token, {
        debug: mixpanelDebugMode,
        ignore_dnt: true,
        batch_requests: false, // Disable batching for more reliable tracking
        api_host: "https://api.mixpanel.com", // Explicitly set API host
        persistence: "localStorage" // More reliable than cookies
      });
      
      // Set default properties that will be included with all events
      const platform = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'web';
      mixpanel.register({
        platform,
        app_version: "1.0.0" // Hardcoded version since we don't have env vars
      });
      
      // Mark as successfully initialized
      mixpanelInitialized = true;
      
      if (mixpanelDebugMode) {
        console.log('✅ Mixpanel initialized successfully');
      }
      
      // Try to send any backed up events
      flushEventQueue();
    } catch (error) {
      console.error(`Failed to initialize Mixpanel (attempt ${retries + 1}):`, error);
      
      if (retries < MAX_RETRIES) {
        retries++;
        // Exponential backoff
        setTimeout(initialize, 1000 * Math.pow(2, retries));
      } else {
        console.error(`❌ Mixpanel initialization failed after ${MAX_RETRIES} attempts`);
      }
    }
  };
  
  // Start initialization
  initialize();
};

/**
 * Track a Mixpanel event with type safety
 * Automatically queues events if Mixpanel isn't initialized
 * 
 * @param eventName - The name of the event to track
 * @param payload - The properties to include with the event
 * @param callback - Optional callback function to execute after tracking
 */
export const trackEvent = <T extends keyof MixpanelEventPayloads>(
  eventName: T,
  payload: MixpanelEventPayloads[T],
  callback?: () => void
): void => {
  try {
    // Add category metadata to help with analysis
    const enrichedPayload = {
      ...payload,
      event_category: EVENT_CATEGORIES[eventName],
      timestamp: (payload as any).timestamp || new Date().toISOString()
    };
    
    // If Mixpanel is not initialized, queue the event for later
    if (!mixpanelInitialized) {
      if (eventBackupQueue.length < MAX_QUEUE_SIZE) {
        eventBackupQueue.push({
          name: eventName as string,
          props: enrichedPayload
        });
        
        if (mixpanelDebugMode) {
          console.log(`⏳ Queued event ${eventName} (Mixpanel not initialized)`);
        }
      }
      
      if (callback) callback();
      return;
    }
    
    // Log in debug mode
    if (mixpanelDebugMode) {
      console.log(`📊 Tracking event: ${eventName}`, enrichedPayload);
    }
    
    mixpanel.track(eventName as string, enrichedPayload, callback);
  } catch (error) {
    console.error(`❌ Mixpanel tracking failed for event "${eventName}"`, error);
    // Still call the callback even if tracking fails
    if (callback) callback();
  }
};

/**
 * Set user identity in Mixpanel
 * @param userId - The unique identifier for the user
 * @param userProperties - Additional properties to associate with the user
 */
export const identifyUser = (userId: string, userProperties?: Record<string, any>): void => {
  try {
    if (!mixpanelInitialized) {
      console.warn('Cannot identify user - Mixpanel not initialized');
      return;
    }
    
    mixpanel.identify(userId);
    if (userProperties) {
      mixpanel.people.set(userProperties);
    }
    
    if (mixpanelDebugMode) {
      console.log(`👤 Identified user: ${userId}`, userProperties || {});
    }
  } catch (error) {
    console.error('Failed to identify user in Mixpanel:', error);
  }
};

/**
 * Reset the user identity in Mixpanel (e.g., on logout)
 */
export const resetUser = (): void => {
  try {
    if (!mixpanelInitialized) {
      console.warn('Cannot reset user - Mixpanel not initialized');
      return;
    }
    
    mixpanel.reset();
    
    if (mixpanelDebugMode) {
      console.log('🔄 Reset user identity');
    }
  } catch (error) {
    console.error('Failed to reset user in Mixpanel:', error);
  }
};

/**
 * Helper to track session events
 */
export const SessionEvents = {
  /**
   * Track when a user starts a new session
   * @param userType - Whether the user is authenticated or a guest
   */
  trackSessionStart: (userType: 'Authenticated' | 'Guest'): void => {
    const platform = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'web';
    trackEvent('SessionStarted', {
      timestamp: new Date().toISOString(),
      user_type: userType,
      platform
    });
  },
  
  /**
   * Track when a user ends their session
   * @param startTime - The time when the session started
   * @param pagesVisited - The number of pages visited during the session
   */
  trackSessionEnd: (startTime: number, pagesVisited: number): void => {
    trackEvent('SessionEnded', {
      duration: Date.now() - startTime,
      pages_visited: pagesVisited
    });
  }
};

/**
 * Helper to track decision flow events
 */
export const DecisionEvents = {
  /**
   * Track when a user starts a new decision-making process
   * @param decisionType - The type of decision being made
   */
  trackDiscussionStart: (decisionType: string): void => {
    trackEvent('DiscussionStarted', {
      decision_type: decisionType,
      timestamp: new Date().toISOString()
    });
  },
  
  /**
   * Track when a user completes a decision-making process
   * @param decisionType - The type of decision made
   * @param startTime - When the decision process started
   * @param wasHelpful - Whether the user found the outcome helpful
   */
  trackDecisionComplete: (decisionType: string, startTime: number, wasHelpful: boolean): void => {
    trackEvent('DecisionCompleted', {
      decision_type: decisionType,
      completion_time: Date.now() - startTime,
      was_helpful: wasHelpful
    });
  },
  
  /**
   * Track when a user opens the summary view
   * @param fromStep - The step the user was on before viewing the summary
   */
  trackSummaryView: (fromStep: string): void => {
    trackEvent('OpenedSummaryView', {
      from_step: fromStep
    });
  },
  
  /**
   * Track when a user abandons a discussion
   * @param inactivityDuration - How long the user was inactive
   * @param currentStep - Which step the user was on when they abandoned
   */
  trackAbandonedDiscussion: (inactivityDuration: number, currentStep: string): void => {
    trackEvent('AbandonedDiscussion', {
      inactivity_duration: inactivityDuration,
      current_step: currentStep
    });
  }
};

/**
 * Helper to track AI interaction events
 */
export const AIEvents = {
  /**
   * Track when a user interacts with an AI model
   * @param model - The AI model used
   * @param actionType - The type of interaction
   * @param responseTime - How long the user took to respond
   */
  trackAIInteraction: (model: string, actionType: string, responseTime: number): void => {
    trackEvent('AIInteracted', {
      model,
      action_type: actionType,
      response_time: responseTime
    });
  },
  
  /**
   * Track when a user clicks on an AI response
   * @param model - The AI model that generated the response
   * @param position - The position of the response in the list
   */
  trackClickedResponse: (model: string, position: number): void => {
    trackEvent('ClickedAIResponse', {
      model,
      position
    });
  },
  
  /**
   * Track when pros and cons are generated
   * @param models - The AI models used to generate
   * @param elapsedTime - Time since discussion started
   */
  trackProsAndConsGenerated: (models: string[], elapsedTime: number): void => {
    trackEvent('ProsAndConsGenerated', {
      models_used: models,
      elapsed_time: elapsedTime
    });
  }
};

/**
 * Helper to track feedback events
 */
export const FeedbackEvents = {
  /**
   * Track when a user clicks the feedback button
   */
  trackFeedbackButtonClicked: (): void => {
    trackEvent('FeedbackButtonClicked', {});
  },
  
  /**
   * Track when a user submits feedback
   * @param feedbackText - The feedback provided by the user
   */
  trackFeedbackSubmission: (feedbackText: string): void => {
    trackEvent('FeedbackSubmitted', {
      feedback_text: feedbackText
    });
  }
};

// ----- IMPLEMENTATION GUIDE -----
/*
HOW TO USE THIS FILE:

1. INSTALLATION:
   - Make sure you have mixpanel-browser installed:
     npm install mixpanel-browser
     or
     yarn add mixpanel-browser

2. COPY THIS FILE:
   - Save this entire file as src/utils/mixpanel.ts in your project

3. INITIALIZE MIXPANEL:
   - In your main application file (App.jsx or main.jsx):

   import { initMixpanel, SessionEvents } from './utils/mixpanel';

   // In your component
   useEffect(() => {
     // Replace with your actual Mixpanel token
     initMixpanel("YOUR_MIXPANEL_TOKEN", true);
     
     // Start tracking session
     const userType = localStorage.getItem('user_id') ? 'Authenticated' : 'Guest';
     SessionEvents.trackSessionStart(userType);
   }, []);

4. TRACK EVENTS:
   - Import helper functions or trackEvent directly:

   import { DecisionEvents, FeedbackEvents, AIEvents } from './utils/mixpanel';

   // Example: Track when a discussion starts
   DecisionEvents.trackDiscussionStart('beef-vs-pork');

   // Example: Track feedback submission
   FeedbackEvents.trackFeedbackSubmission(feedbackText);

   // Example: Track AI interaction
   AIEvents.trackAIInteraction('Moderator', 'analyze', responseTime);
*/
