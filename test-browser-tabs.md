# Test Plan for Independent Browser Tabs

## Test Scenarios

1. **Create Multiple Browser Tabs**
   - Click the browser/preview button multiple times to create multiple browser tabs
   - Each tab should have its own independent browser instance

2. **Navigate Independently**
   - Navigate to different URLs in each browser tab
   - Each tab should maintain its own navigation history
   - URLs should be saved per tab

3. **Browser Controls per Tab**
   - Test refresh button on each tab - should only refresh that specific browser
   - Test DevTools button on each tab - should open DevTools for that specific browser
   - Test URL input on each tab - should navigate only that browser

4. **Tab Switching**
   - Switch between browser tabs
   - Each should show/hide its own browser view correctly
   - Browser position should be maintained when switching tabs

5. **Tab Closing**
   - Close a browser tab
   - The browser view for that tab should be destroyed
   - Other browser tabs should continue working

## Expected Behavior

- Each browser tab operates completely independently
- No shared state between browser tabs
- Each tab has its own:
  - URL and navigation history
  - Browser view instance
  - DevTools instance
  - Saved URL in localStorage

## Implementation Summary

The changes enable independent browser tabs by:
1. Creating a Map of browser views in main.js instead of a single instance
2. Adding browser ID parameters to all IPC calls
3. Creating/destroying browser views on demand
4. Managing active browser state per tab