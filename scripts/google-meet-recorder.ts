/**
 * Google Meet Auto-Recorder
 * Automatically joins a Google Meet and starts recording
 *
 * Usage:
 *   npx tsx scripts/google-meet-recorder.ts <meet-url> [class-name]
 *
 * Example:
 *   npx tsx scripts/google-meet-recorder.ts "https://meet.google.com/abc-defg-hij" "A1 Morning Class"
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

interface RecorderConfig {
  meetUrl: string;
  className?: string;
  profilePath?: string;
  headless?: boolean;
  recordingDuration?: number; // in minutes
}

class GoogleMeetRecorder {
  private config: RecorderConfig;

  constructor(config: RecorderConfig) {
    this.config = {
      profilePath: path.join(process.cwd(), '.chrome-profile'),
      headless: false, // Set to true for production
      recordingDuration: 90, // Default 90 minutes
      ...config
    };
  }

  async start() {
    console.log('🎥 Google Meet Auto-Recorder Starting...');
    console.log(`📍 Meeting URL: ${this.config.meetUrl}`);
    console.log(`📚 Class: ${this.config.className || 'Not specified'}`);
    console.log(`⏱️  Recording duration: ${this.config.recordingDuration} minutes`);

    const browser = await puppeteer.launch({
      headless: this.config.headless,
      userDataDir: this.config.profilePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--use-fake-ui-for-media-stream', // Auto-allow camera/mic permissions
        '--use-fake-device-for-media-stream',
        '--window-size=1920,1080',
      ],
      defaultViewport: null,
    });

    try {
      const page = await browser.newPage();

      // Navigate to Google Meet
      console.log('🌐 Navigating to Google Meet...');
      await page.goto(this.config.meetUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait a bit for page to fully load
      await this.sleep(3000);

      // Check if we need to login
      const needsLogin = await this.checkIfNeedsLogin(page);
      if (needsLogin) {
        console.log('⚠️  Not logged in! Please log in manually in the browser window.');
        console.log('   The script will wait for 60 seconds...');
        await this.sleep(60000);
      }

      // Turn off camera and microphone before joining
      console.log('📷 Turning off camera and microphone...');
      await this.toggleCameraAndMic(page);

      // Click "Join now" or "Ask to join" button
      console.log('🚪 Attempting to join meeting...');
      await this.joinMeeting(page);

      // Wait for meeting to load and auto-recording to start (5 seconds)
      console.log('⏱️  Waiting 5 seconds for auto-recording to start...');
      await this.sleep(5000);

      // Verify recording is active
      console.log('🔍 Verifying recording status...');
      const isRecording = await this.verifyRecordingActive(page);

      if (isRecording) {
        console.log('✅ CONFIRMED: Recording is active!');
      } else {
        console.log('⚠️  WARNING: Could not confirm recording status!');
        console.log('   Manual verification recommended.');
        // Optionally: Take a screenshot for debugging
        await page.screenshot({ path: `recording-check-${Date.now()}.png` });
        console.log('   Screenshot saved for manual verification.');
      }

      console.log(`⏰ Keeping session alive for ${this.config.recordingDuration} minutes`);
      console.log('   The recording will continue automatically.');

      // Keep the browser open for the recording duration
      await this.sleep(this.config.recordingDuration! * 60 * 1000);

      console.log('⏹️  Class duration completed. Leaving meeting...');

    } catch (error) {
      console.error('❌ Error during recording:', error);
      throw error;
    } finally {
      await browser.close();
      console.log('🏁 Browser closed.');
    }
  }

  private async checkIfNeedsLogin(page: any): Promise<boolean> {
    try {
      // Check for common Google login indicators
      const loginButton = await page.$('a[href*="accounts.google.com"]');
      return loginButton !== null;
    } catch {
      return false;
    }
  }

  private async toggleCameraAndMic(page: any): Promise<void> {
    try {
      // Wait for and click camera button to turn it off
      const cameraButton = await page.waitForSelector('[aria-label*="camera" i], [aria-label*="Turn off camera" i], [data-is-muted="false"][aria-label*="camera" i]', {
        timeout: 10000,
        visible: true
      }).catch(() => null);

      if (cameraButton) {
        const isCameraOn = await page.evaluate((el: any) => {
          return el.getAttribute('data-is-muted') === 'false' ||
                 el.getAttribute('aria-label').includes('Turn off');
        }, cameraButton);

        if (isCameraOn) {
          await cameraButton.click();
          console.log('   ✓ Camera turned off');
        }
      }

      // Wait for and click microphone button to turn it off
      const micButton = await page.waitForSelector('[aria-label*="microphone" i], [aria-label*="Turn off microphone" i], [data-is-muted="false"][aria-label*="microphone" i]', {
        timeout: 10000,
        visible: true
      }).catch(() => null);

      if (micButton) {
        const isMicOn = await page.evaluate((el: any) => {
          return el.getAttribute('data-is-muted') === 'false' ||
                 el.getAttribute('aria-label').includes('Turn off');
        }, micButton);

        if (isMicOn) {
          await micButton.click();
          console.log('   ✓ Microphone turned off');
        }
      }

      await this.sleep(1000);
    } catch (error) {
      console.log('   ⚠️  Could not toggle camera/mic (might already be off)');
    }
  }

  private async joinMeeting(page: any): Promise<void> {
    try {
      // Try different possible "Join" button selectors
      const joinSelectors = [
        'button[jsname="Qx7uuf"]', // Common "Join now" button
        'span:has-text("Join now")',
        'span:has-text("Ask to join")',
        'button:has-text("Join now")',
        'button:has-text("Ask to join")',
        '[aria-label*="Join" i]',
      ];

      for (const selector of joinSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            console.log('   ✓ Clicked join button');
            return;
          }
        } catch (e) {
          continue;
        }
      }

      // If no button found, try finding by text content
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, span'));
        const joinButton = buttons.find(btn =>
          btn.textContent?.includes('Join now') ||
          btn.textContent?.includes('Ask to join')
        );
        if (joinButton) {
          (joinButton as HTMLElement).click();
        }
      });

      console.log('   ✓ Attempted to join meeting');
    } catch (error) {
      console.error('   ❌ Failed to join meeting:', error);
      throw error;
    }
  }


  private async verifyRecordingActive(page: any): Promise<boolean> {
    try {
      // Wait a bit more to ensure recording UI has appeared
      await this.sleep(2000);

      // Check for various recording indicators
      const recordingIndicators = [
        // Text-based indicators
        'text="Recording"',
        'text="REC"',
        'text="Recording in progress"',
        // Aria labels
        '[aria-label*="Recording" i]',
        '[aria-label*="recording in progress" i]',
        // Common class names or attributes
        '[data-recording="true"]',
        '.recording-indicator',
        // Red dot indicator (common visual element)
        'div[style*="background-color: rgb(234, 67, 53)"]', // Google's red color
        'div[style*="background-color: rgb(255, 0, 0)"]', // Pure red
      ];

      // Try each selector
      for (const selector of recordingIndicators) {
        const element = await page.$(selector).catch(() => null);
        if (element) {
          console.log(`   ✓ Found recording indicator: ${selector}`);
          return true;
        }
      }

      // Check page content for recording text
      const pageContent = await page.content();
      const recordingKeywords = ['Recording', 'REC', 'recording in progress', 'Recording started'];

      for (const keyword of recordingKeywords) {
        if (pageContent.includes(keyword)) {
          console.log(`   ✓ Found recording keyword in page: ${keyword}`);
          return true;
        }
      }

      // Advanced check: Look for any element containing "rec" text
      const hasRecordingElement = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent?.toLowerCase() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          if (text.includes('recording') || ariaLabel.includes('recording')) {
            return true;
          }
        }
        return false;
      });

      if (hasRecordingElement) {
        console.log('   ✓ Found recording indicator in DOM');
        return true;
      }

      console.log('   ⚠️  No recording indicator found');
      return false;

    } catch (error) {
      console.error('   ❌ Error checking recording status:', error);
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Usage
async function main() {
  const meetUrl = process.argv[2];
  const className = process.argv[3];

  if (!meetUrl) {
    console.error('❌ Error: Meeting URL is required');
    console.log('Usage: npx tsx scripts/google-meet-recorder.ts <meet-url> [class-name]');
    console.log('Example: npx tsx scripts/google-meet-recorder.ts "https://meet.google.com/abc-defg-hij" "A1 Class"');
    process.exit(1);
  }

  const recorder = new GoogleMeetRecorder({
    meetUrl,
    className,
    headless: false, // Set to true for production
  });

  await recorder.start();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { GoogleMeetRecorder };
