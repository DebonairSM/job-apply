/**
 * Human Behavior Simulation Utilities
 * 
 * Functions to simulate human-like interactions with LinkedIn to reduce detection risk.
 * These behaviors help make automation appear more natural by adding:
 * - Random scrolling with pauses (reading behavior)
 * - Occasional mouse movements
 * - Variable delays with normal distribution (more realistic than uniform)
 * - Reading pauses (simulate reading content)
 */

import { Page, Locator } from 'playwright';

/**
 * Generate a random delay using normal distribution approximation
 * More realistic than uniform random - most delays cluster around the mean
 * 
 * @param minMs Minimum delay in milliseconds
 * @param maxMs Maximum delay in milliseconds
 * @returns Delay value in milliseconds (clamped to min-max range)
 */
function normalRandomDelay(minMs: number, maxMs: number): number {
  const mean = (minMs + maxMs) / 2;
  const stdDev = (maxMs - minMs) / 6; // 99.7% of values within 3 std devs
  
  // Box-Muller transformation for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Scale and shift to our desired range
  let value = mean + z * stdDev;
  
  // Clamp to min-max range
  value = Math.max(minMs, Math.min(maxMs, value));
  
  return Math.round(value);
}

/**
 * Random delay for human-like behavior between contacts
 * Uses normal distribution for more realistic timing
 * 
 * @param minMs Minimum delay (default: 5000ms / 5 seconds)
 * @param maxMs Maximum delay (default: 15000ms / 15 seconds)
 */
export async function randomHumanDelay(minMs: number = 5000, maxMs: number = 15000): Promise<void> {
  const delay = normalRandomDelay(minMs, maxMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Random delay for human-like behavior between pages
 * Longer delays to simulate reading/searching through results
 * 
 * @param minMs Minimum delay (default: 30000ms / 30 seconds)
 * @param maxMs Maximum delay (default: 90000ms / 90 seconds)
 */
export async function randomPageDelay(minMs: number = 30000, maxMs: number = 90000): Promise<void> {
  const delay = normalRandomDelay(minMs, maxMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Random delay for batch breaks (after processing multiple contacts)
 * Longer delays to simulate natural breaks in activity
 * 
 * @param minMs Minimum delay (default: 60000ms / 1 minute)
 * @param maxMs Maximum delay (default: 180000ms / 3 minutes)
 */
export async function randomBatchDelay(minMs: number = 60000, maxMs: number = 180000): Promise<void> {
  const delay = normalRandomDelay(minMs, maxMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simulate reading behavior by scrolling and pausing
 * Scrolls randomly through the page with pauses to simulate reading
 * 
 * @param page Playwright page instance
 * @param minPauses Minimum number of scroll pauses (default: 1)
 * @param maxPauses Maximum number of scroll pauses (default: 3)
 */
export async function simulateReading(page: Page, minPauses: number = 1, maxPauses: number = 3): Promise<void> {
  const numPauses = Math.floor(Math.random() * (maxPauses - minPauses + 1)) + minPauses;
  
  for (let i = 0; i < numPauses; i++) {
    // Random scroll amount (100-500 pixels)
    const scrollAmount = Math.floor(Math.random() * 400) + 100;
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    // Pause for reading (2-8 seconds)
    const readDelay = normalRandomDelay(2000, 8000);
    await new Promise(resolve => setTimeout(resolve, readDelay));
  }
}

/**
 * Simulate scrolling to bring an element into view
 * Scrolls smoothly to element with random variation
 * 
 * @param page Playwright page instance
 * @param locator Locator for element to scroll to
 */
export async function simulateScrolling(page: Page, locator: Locator): Promise<void> {
  try {
    // Scroll element into view with smooth behavior
    await locator.scrollIntoViewIfNeeded({ timeout: 3000 });
    
    // Random small additional scroll (human-like overshoot)
    const overshoot = Math.floor(Math.random() * 50) - 25; // -25 to +25 pixels
    if (overshoot !== 0) {
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, overshoot);
    }
    
    // Small pause after scrolling (reading time)
    const pauseDelay = normalRandomDelay(500, 2000);
    await new Promise(resolve => setTimeout(resolve, pauseDelay));
  } catch (error) {
    // If scrolling fails, just continue - not critical
  }
}

/**
 * Simulate mouse movement over an element
 * Occasional mouse movements make automation appear more human-like
 * 
 * @param page Playwright page instance
 * @param locator Locator for element to hover over
 * @param probability Probability of moving mouse (0.0 to 1.0, default: 0.3 / 30%)
 */
export async function simulateMouseMovement(page: Page, locator: Locator, probability: number = 0.3): Promise<void> {
  // Only move mouse occasionally (not every time)
  if (Math.random() > probability) {
    return;
  }
  
  try {
    // Hover over element (triggers mouse movement)
    await locator.hover({ timeout: 2000 }).catch(() => {
      // If hover fails, just continue - not critical
    });
    
    // Small random delay after hover
    const delay = normalRandomDelay(200, 800);
    await new Promise(resolve => setTimeout(resolve, delay));
  } catch (error) {
    // If mouse movement fails, just continue - not critical
  }
}

/**
 * Simulate natural scrolling behavior while processing a page
 * Scrolls through the page with random pauses and variations
 * 
 * @param page Playwright page instance
 */
export async function simulateNaturalScrolling(page: Page): Promise<void> {
  // Get viewport height
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  
  // Random number of scroll steps (3-8 steps)
  const numSteps = Math.floor(Math.random() * 6) + 3;
  
  for (let i = 0; i < numSteps; i++) {
    // Random scroll amount (viewport height / 2 to full viewport)
    const scrollAmount = Math.floor(Math.random() * viewportHeight * 0.5) + viewportHeight * 0.5;
    
    // Smooth scroll with random speed variation
    await page.evaluate((amount) => {
      const start = window.pageYOffset;
      const target = start + amount;
      const distance = target - start;
      const duration = 300 + Math.random() * 200; // 300-500ms
      let startTime: number | null = null;
      
      const easeInOutQuad = (t: number): number => {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      };
      
      const scroll = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        window.scrollTo(0, start + distance * easeInOutQuad(progress));
        
        if (progress < 1) {
          requestAnimationFrame(scroll);
        }
      };
      
      requestAnimationFrame(scroll);
    }, scrollAmount);
    
    // Wait for scroll to complete plus random pause (reading)
    const pauseDelay = normalRandomDelay(1000, 3000);
    await new Promise(resolve => setTimeout(resolve, pauseDelay + 400));
  }
}

/**
 * Simulate reading a profile card
 * Scrolls card into view, pauses, and optionally hovers
 * 
 * @param page Playwright page instance
 * @param cardLocator Locator for the profile card
 */
export async function simulateReadingCard(page: Page, cardLocator: Locator): Promise<void> {
  // Scroll card into view with natural scrolling
  await simulateScrolling(page, cardLocator);
  
  // Random chance to hover (20% probability)
  await simulateMouseMovement(page, cardLocator, 0.2);
  
  // Reading pause (2-5 seconds to simulate reading profile info)
  const readDelay = normalRandomDelay(2000, 5000);
  await new Promise(resolve => setTimeout(resolve, readDelay));
}




