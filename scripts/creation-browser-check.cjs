const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'runtime/local-config.json')));
const account = JSON.parse(fs.readFileSync(path.join(root, 'runtime/demo-account.json')));
const origin = `http://127.0.0.1:${config.webPort || 8100}`;
const script = 'Discover our reusable bottle. Take it on adventures. Keep your water cold all day.';
const report = { checks: [] };
async function main() {
    const browser = await chromium.launch({ executablePath: config.browserExe, headless: true });
    const page = await browser.newPage();
    const errors = [];
    const serverErrors = [];
    const dialogs = [];
    page.on('dialog', async dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        if (dialog.type() === 'confirm') await dialog.accept();
        else await dialog.dismiss();
    });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 500) serverErrors.push({ url: r.url(), status: r.status() }); });
    try {
        await page.goto(origin + '/login');
        await page.locator('#email').fill(account.email);
        await page.locator('#password').fill(account.password);
        await page.locator('button[type=submit]').click();
        await page.waitForURL('**/dashboard');
        if (process.env.CREATION_REVIEW_PROJECT_ID) {
            report.projectId = process.env.CREATION_REVIEW_PROJECT_ID;
            await page.goto(`${origin}/review/${report.projectId}`);
        } else {
        await page.goto(origin + '/create');
        await page.getByLabel('Project name').fill('Creation page regression check');
        await page.getByLabel('Category', { exact: true }).fill('Bottle');
        await page.getByLabel('Description', { exact: true }).fill(script);
        await page.getByRole('combobox', { name: /^Language/ }).selectOption('english');
        await page.getByLabel('Your script', { exact: true }).fill(script);
        await page.getByLabel('Voiceover (MP3 or WAV, up to 10 MB)').setInputFiles(path.join(root, 'runtime/provider-test-voice.wav'));
        await page.getByRole('button', { name: 'Generate scenes', exact: true }).click();
        await page.waitForURL(/\/processing\/\d+$/, { timeout: 30000 });
        report.projectId = page.url().match(/processing\/(\d+)/)[1];
        await page.getByRole('heading', { name: 'Processing Your Video Ad', exact: true }).waitFor();
        assert.equal(await page.locator('#open-logs-btn').count(), 0);
        report.checks.push('React form submission', 'processing page loads with diagnostics disabled');
        console.log(JSON.stringify({ projectId: report.projectId, processingPage: 'passed' }));
        await page.waitForResponse(r => r.url().includes(`/processing/${report.projectId}/status`) && r.status() === 200, { timeout: 15000 });
        report.checks.push('browser status polling');
        await page.waitForURL(new RegExp(`/review/${report.projectId}$`), { timeout: 180000 });
        assert.equal(await page.getByText('Internal Server Error', { exact: true }).count(), 0);
        report.checks.push('automatic redirect to generated scene review');
        }
        await page.waitForFunction(() => {
            const videos = [...document.querySelectorAll('video[id^="video-"]')];
            return videos.length > 0 && videos.every(v => Number.isFinite(v.duration) && v.duration > 0);
        }, { timeout: 60000 });
        await page.getByRole('button', { name: 'Confirm All Scenes' }).click();
        await page.waitForURL(new RegExp(`/subtitle-styles/${report.projectId}$`), { timeout: 30000 });
        await page.waitForFunction(() => Boolean(window.voiceoverUrl) || document.getElementById('processingSection')?.style.display === 'none');
        report.checks.push('scene confirmation opens subtitle selection', 'uploaded voiceover preparation');
        console.log(JSON.stringify({ projectId: report.projectId, subtitlePage: 'passed' }));
        await page.locator('.style-category[data-style="progressive_highlight"]').click();
        const generation = page.waitForResponse(r => r.url().endsWith(`/subtitle-styles/${report.projectId}/generate`) && r.request().method() === 'POST');
        await page.getByRole('button', { name: 'Render Video', exact: true }).click();
        const submitted = await generation;
        assert.equal(submitted.status(), 200);
        await page.waitForURL(new RegExp(`/processing/${report.projectId}$`));
        report.checks.push('subtitle style selection and render submission');
        console.log(JSON.stringify({ projectId: report.projectId, renderSubmission: 'passed' }));
        await page.waitForURL(new RegExp(`/final/${report.projectId}$`), { timeout: 240000 });
        const downloadLink = page.locator('a.download-btn').first();
        const downloadResponse = await page.request.get(await downloadLink.getAttribute('href'));
        assert.equal(downloadResponse.status(), 200);
        assert.match(downloadResponse.headers()['content-type'], /video\/mp4/);
        const bytes = await downloadResponse.body();
        assert.ok(bytes.length > 1000);
        report.downloadBytes = bytes.length;
        report.checks.push('completed render opens final page', 'authorized MP4 download');
        assert.deepEqual(serverErrors, []);
        assert.deepEqual(errors, []);
        report.browserErrors = errors;
        report.serverErrors = serverErrors;
        fs.writeFileSync(path.join(root, 'runtime/creation-browser-verification.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report));
    } finally {
        report.lastUrl = page.url();
        report.browserErrors = errors;
        report.serverErrors = serverErrors;
        report.dialogs = dialogs;
        fs.writeFileSync(path.join(root, 'runtime/creation-browser-verification.json'), JSON.stringify(report, null, 2));
        await browser.close();
    }
}
main().catch(e => { console.error('Creation browser check failed:', e.message); process.exitCode = 1; });
