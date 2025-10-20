/**
 * Diagnose Instagram webhook configuration
 */

console.log('🔍 Instagram Webhook Diagnostic\n')
console.log('=' .repeat(70))

console.log('\n✅ Environment Variables Check:')
console.log(`   INSTAGRAM_WEBHOOK_VERIFY_TOKEN: ${process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ? '✓ Set' : '✗ Missing'}`)
console.log(`   INSTAGRAM_ACCESS_TOKEN: ${process.env.INSTAGRAM_ACCESS_TOKEN ? '✓ Set' : '✗ Missing'}`)
console.log(`   INSTAGRAM_BUSINESS_ACCOUNT_ID: ${process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ? '✓ Set' : '✗ Missing'}`)

console.log('\n📋 Webhook URL to use in Meta Developer Portal:')
console.log('   https://planbeta.app/api/webhooks/instagram')

console.log('\n🔑 Verify Token to use:')
console.log(`   ${process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'plan_beta_instagram_webhook_2024'}`)

console.log('\n📝 Required Webhook Subscriptions in Meta Portal:')
console.log('   For COMMENTS on posts:')
console.log('     ✓ Subscribe to "comments" field')
console.log('     ✓ Permission: instagram_manage_comments (approved)')
console.log('\n   For DIRECT MESSAGES (DMs):')
console.log('     ✓ Subscribe to "messages" field')
console.log('     ✓ Permission: instagram_manage_messages (needs App Review)')

console.log('\n🧪 Test Webhook Reception:')
console.log('   1. Go to Instagram app')
console.log('   2. Find one of your posts/reels')
console.log('   3. Add a comment: "test webhook reception"')
console.log('   4. Wait 10 seconds')
console.log('   5. Check database for new comment')

console.log('\n💡 Troubleshooting Steps:')
console.log('   If comments not appearing:')
console.log('   1. Check Meta Developer Portal > Webhooks > Instagram')
console.log('   2. Verify "comments" field is checked')
console.log('   3. Click "Test" button next to subscription')
console.log('   4. Check if verification succeeds')
console.log('   5. Review error logs in Meta Portal if failed')

console.log('\n   Common Issues:')
console.log('   • Webhook URL not verified → Re-verify in Meta Portal')
console.log('   • Wrong verify token → Must match .env exactly')
console.log('   • Not subscribed to correct fields → Check "comments"')
console.log('   • Page not connected → Connect Instagram Business Account')
console.log('   • App not published → Must be in Production mode')

console.log('\n' + '='.repeat(70))
console.log('\n📊 Next: Run database check to see recent activity')
console.log('   npx tsx scripts/check-recent-instagram.ts\n')
