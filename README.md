# Figma Make Reference Implementation

## Purpose

This repository contains a Figma Make prototype for one feature of the app. The prototype is intended to serve as a reference implementation for the production app and should be used to preserve the design, interactions, and functionality as closely as reasonably possible.

The production implementation does not need to use this repository's overall project structure. Components and logic should be adapted to fit the architecture, backend, navigation, data models, and shared components used in the production app.

## What to Preserve

Please preserve the following as closely as possible:

- Overall visual design and layout
- Spacing, sizing, and hierarchy
- Component appearance
- User interactions and flows
- Button placement and behavior
- Navigation behavior within the feature
- Animations and transitions
- Modals, menus, and interactive states
- Responsive/mobile behavior
- Approved wording and labels
- Small UI details that contribute to the intended experience

Rather than recreating the feature based only on screenshots or visual inspection, please reuse or adapt the existing React implementation wherever technically reasonable.

## Mock / Placeholder Data

Content shown in this prototype should not automatically be treated as real production data or product requirements.

Unless explicitly noted otherwise, treat the following as placeholder/mock data:

- Names
- Dates
- Scores
- Percentages
- Streak counts
- Example accomplishments
- Example posts
- Example recommendations
- Example patterns or insights
- User histories
- Profile information
- Notifications
- Hard-coded statistics
- Demo content
- Sample responses

Replace these values with real production data, backend data, or appropriate empty/loading states.

The visual component or interaction displaying the data may still be intentional even when the specific content is not.

## Productionization

Please adapt prototype-only implementation details as needed, including:

- Hard-coded data
- Local-only state
- Temporary navigation
- Mock user information
- Placeholder API behavior
- Prototype storage
- Figma-specific implementation choices

Use the production app's existing:

- Authentication
- Backend/database
- API structure
- Routing/navigation
- State management
- Shared components
- Design system
- Accessibility standards

where appropriate.

## Important Implementation Principle

Treat this repository as a reference implementation, not merely visual inspiration.

Where technically reasonable, preserve or port the existing components, styling, interaction logic, transitions, and behavior rather than rebuilding the feature from scratch.

If something cannot be transferred directly into the production architecture, reproduce the behavior and appearance as closely as possible.

When uncertain whether something is intentional design or prototype filler, preserve the visual and interaction pattern but do not assume the underlying mock content should be retained.

## Feature-Specific Notes

### Preserve

- Add feature-specific requirements here.

### Replace / Ignore

- Add any feature-specific mock content or prototype-only behavior here.
