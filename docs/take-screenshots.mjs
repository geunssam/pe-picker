/**
 * PEPick 스크린샷 자동 캡처 스크립트
 * app.js의 __SCREENSHOT_MODE__ 플래그로 인증/동의를 건너뜁니다.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, 'images');
const BASE_URL = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  // ── 1. Login page ──
  console.log('📸 1. Login page...');
  const loginPage = await context.newPage();
  await loginPage.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle' });
  await loginPage.waitForTimeout(1500);
  await loginPage.screenshot({ path: path.join(IMG_DIR, '01-login.png'), fullPage: false });
  console.log('  ✅ done');
  await loginPage.close();

  // ── 2. Main app ──
  const page = await context.newPage();

  // Inject SCREENSHOT_MODE flag before any script runs
  await page.addInitScript(() => {
    window.__SCREENSHOT_MODE__ = true;
  });

  // Navigate to set localStorage on same origin
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Inject mock data
  await page.evaluate(() => {
    const mockClasses = [
      { id: 'cls_demo_001', name: '3학년 1반', grade: 3, classNum: 1, schoolLevel: 'elementary', students: [], createdAt: '2026-02-01T00:00:00Z' },
      { id: 'cls_demo_002', name: '4학년 2반', grade: 4, classNum: 2, schoolLevel: 'elementary', students: [], createdAt: '2026-02-01T00:00:00Z' },
      { id: 'cls_demo_003', name: '5학년 3반', grade: 5, classNum: 3, schoolLevel: 'elementary', students: [], createdAt: '2026-02-01T00:00:00Z' },
    ];

    const names = [
      '김민준','이서윤','박지호','최수아','정예준',
      '강하은','조민서','윤지안','장도윤','임서현',
      '한시우','오하린','신유준','배지유','권현우',
      '송다은','류태윤','문채원','양준서','홍소율',
      '백승현','노유나','구하율','남지원','천서준',
    ];
    const mockStudents = names.map((name, i) => ({
      id: `stu_demo_${String(i + 1).padStart(3, '0')}`,
      name, number: i + 1,
      gender: i % 2 === 0 ? 'male' : 'female',
      classId: 'cls_demo_001',
    }));

    // Mock teams
    const mockTeams = [
      { id: 'team_1', name: '1모둠', members: mockStudents.slice(0, 5).map(s => s.id) },
      { id: 'team_2', name: '2모둠', members: mockStudents.slice(5, 10).map(s => s.id) },
      { id: 'team_3', name: '3모둠', members: mockStudents.slice(10, 15).map(s => s.id) },
      { id: 'team_4', name: '4모둠', members: mockStudents.slice(15, 20).map(s => s.id) },
      { id: 'team_5', name: '5모둠', members: mockStudents.slice(20, 25).map(s => s.id) },
    ];

    const badgeTypes = ['cooperation','respect','consideration','safety','leadership','teamwork','fairplay','victory','challenge','positivity'];
    const badgeLogs = [];
    mockStudents.forEach((student, si) => {
      const numBadges = 2 + Math.floor(si * 1.5);
      for (let b = 0; b < numBadges; b++) {
        badgeLogs.push({
          id: `badge_demo_${si}_${b}`,
          timestamp: new Date(Date.now() - b * 86400000).toISOString(),
          classId: 'cls_demo_001',
          studentId: student.id, studentName: student.name,
          badgeType: badgeTypes[b % badgeTypes.length],
          xp: 10, context: 'badge-collection',
        });
      }
    });

    localStorage.setItem('pet_classes', JSON.stringify(mockClasses));
    localStorage.setItem('pet_students_cls_demo_001', JSON.stringify(mockStudents));
    localStorage.setItem('pet_teams_cls_demo_001', JSON.stringify(mockTeams));
    localStorage.setItem('pet_selected_class', 'cls_demo_001');
    localStorage.setItem('pet_badge_log', JSON.stringify(badgeLogs));
    localStorage.setItem('pet_thermostat', JSON.stringify({
      cls_demo_001: {
        targetBadges: 200,
        milestones: [
          { temp: 20, reward: '야외 수업 1회' },
          { temp: 40, reward: '자유시간 2분 추가' },
          { temp: 60, reward: '과자파티' },
          { temp: 80, reward: '학급 영화관' },
          { temp: 100, reward: '소풍 가기' },
        ],
      },
    }));
    localStorage.setItem('pet_settings', JSON.stringify({
      teacherName: '근쌤',
      defaultGroupNames: ['1모둠','2모둠','3모둠','4모둠','5모둠','6모둠'],
    }));
    localStorage.setItem('pet_teacher', JSON.stringify({
      teacherName: '근쌤', onboarded: true,
    }));
    localStorage.setItem('pet_tag_game', JSON.stringify({
      taggerCount: 2, angelCount: 1,
      timerMinutes: 3, timerSeconds: 0, excludeDuplicates: false,
    }));
    localStorage.setItem('pet_group_manager', JSON.stringify({
      mode: 'random', membersPerGroup: 5, groupCount: 4,
      timerMinutes: 5, timerSeconds: 0, nameMode: 'number',
    }));
  });

  // Reload to apply mock data
  console.log('  Reloading with mock data + SCREENSHOT_MODE...');
  await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const url = page.url();
  console.log('  Current URL:', url);

  if (url.includes('login')) {
    console.log('  ❌ Auth bypass failed.');
    await browser.close();
    return;
  }

  // Debug: check page content
  const pageContent = await page.evaluate(() => document.body.innerText.substring(0, 200));
  console.log('  Page content preview:', pageContent.substring(0, 100));

  // ── Capture screens ──
  async function capture(name, filename) {
    console.log(`📸 ${name}...`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(IMG_DIR, filename), fullPage: true });
    console.log('  ✅ done');
  }

  await capture('Class selector', '02-class-selector.png');

  // Tag game
  await page.evaluate(() => { window.location.hash = '#tag-game'; });
  await page.waitForTimeout(500);
  await capture('Tag game', '03-tag-game.png');

  // Group manager
  await page.evaluate(() => { window.location.hash = '#group-manager'; });
  await page.waitForTimeout(500);
  await capture('Group manager', '04-group-manager.png');

  // Badge collection - personal tab
  await page.evaluate(() => { window.location.hash = '#class-stats'; });
  await page.waitForTimeout(500);
  await capture('Badge personal', '05-badge-personal.png');

  // Badge collection - class tab (thermometer)
  console.log('📸 Badge class (thermometer)...');
  // Try multiple selectors for the class tab
  const clicked = await page.evaluate(() => {
    // Try data-tab attribute
    let btn = document.querySelector('[data-tab="class"]');
    if (btn) { btn.click(); return 'data-tab'; }
    // Try button text
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      if (b.textContent.includes('학급') || b.textContent.includes('통계')) {
        b.click();
        return 'text-match: ' + b.textContent;
      }
    }
    return 'not-found';
  });
  console.log('  Tab click result:', clicked);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(IMG_DIR, '06-badge-class.png'), fullPage: true });
  console.log('  ✅ done');

  // Settings
  await page.evaluate(() => { window.location.hash = '#settings'; });
  await page.waitForTimeout(500);
  await capture('Settings', '07-settings.png');

  await page.close();
  await browser.close();
  console.log('\n🎉 All screenshots captured! Check docs/images/');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
