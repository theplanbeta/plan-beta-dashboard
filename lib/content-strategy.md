# Content Lab: Smart Multi-Timeframe Fetching Strategy

## How It Works

The system automatically finds high-yield content for your Instagram Reels by mining Reddit discussions. When posts run dry, it **automatically escalates** through different timeframes to ensure continuous content supply.

## Automatic Timeframe Escalation

### The Ladder:
```
Week → Month → Year → All Time
```

### How It Escalates:

1. **Start**: Fetch top posts from the **past week**
2. **No posts?** → Auto-escalate to **past month**
3. **Still nothing?** → Escalate to **past year**
4. **Final fallback**: **All time** (classic evergreen gems)

### What This Means:

- **Fresh content first**: Always tries to get recent discussions
- **Never runs dry**: Automatically finds older gems when recent posts are exhausted
- **Quality maintained**: All posts still need 50+ upvotes, 5+ comments
- **Tracked per subreddit**: Each subreddit has its own timeframe

## Subreddit Strategy

### Current Active Subreddits:

| Subreddit | Focus | Why It's Good |
|-----------|-------|---------------|
| **Germany** | General German culture, life | High engagement, broad topics |
| **IWantOut** | Emigration discussions | Direct intent to move countries |
| **expats** | Expat experiences worldwide | Real experiences from people who moved |
| **AskAGerman** | Q&A about Germany | Specific questions → specific answers |
| **cscareerquestionsEU** | Tech jobs in Europe | Appeals to Indian software engineers |

### Recommended Additional Subreddits:

```typescript
// Add these for even more content:
const recommendedSubs = [
  'StudyInGermany',      // Student visas, university life
  'German',              // Language learning discussions
  'Finanzen',            // German finance (has expat threads)
  'Munich',              // City-specific (high-quality)
  'Berlin',              // City-specific (diverse expat community)
  'FragReddit',          // German Ask Reddit (some English threads)
]
```

## How to Add More Subreddits

```bash
npx tsx -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();

  await prisma.subreddit.create({
    data: {
      name: 'StudyInGermany',
      description: 'Subreddit for students planning to study in Germany',
      category: 'education',
      active: true,
      currentTimeframe: 'week' // Starts fresh
    }
  });

  await prisma.\$disconnect();
"
```

## Quality Filters

Posts must meet ALL criteria:
- ✅ 50+ upvotes (community validation)
- ✅ 5+ comments (has discussion)
- ✅ Not stickied/promoted
- ✅ Relevant to Indians moving to Germany

Comments must meet:
- ✅ 2+ upvotes
- ✅ 50+ characters
- ✅ Not deleted/removed
- ✅ Sorted by upvotes (gems first)

## Content Relevance Filter

The AI automatically **rejects** posts that are:
- ❌ Local crime news
- ❌ German politics (not relevant to expats)
- ❌ Irrelevant local events
- ❌ Fear-mongering content

The AI **approves** posts about:
- ✅ Visa tips & immigration process
- ✅ Job market & salaries
- ✅ Culture shock & integration
- ✅ Language learning
- ✅ Education & universities
- ✅ Bureaucracy tips
- ✅ Cost of living
- ✅ Expat experiences

## Expected Content Flow

### Week 1-2: Fresh Content
- Fetching from **this week**
- 10-20 quality posts per fetch
- Topics: Recent discussions, current events

### Week 3-4: Recent Past
- Some subreddits escalate to **month**
- 5-15 quality posts per fetch
- Topics: Broader discussions, seasonal content

### Week 5-8: Deeper Dig
- More subreddits at **month**, some at **year**
- 3-10 quality posts per fetch
- Topics: Evergreen advice, classic stories

### Week 9+: Evergreen Gems
- Most subreddits at **year** or **all time**
- 1-5 quality posts per fetch
- Topics: Timeless gems, best-of-all-time discussions

## How to Reset Timeframes

If you want to start fresh (after new content has been posted to Reddit):

```bash
npx tsx -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();

  // Reset all subreddits back to 'week'
  await prisma.subreddit.updateMany({
    where: { active: true },
    data: { currentTimeframe: 'week' }
  });

  console.log('✅ All subreddits reset to week');
  await prisma.\$disconnect();
"
```

## Alternative Strategies (For Future)

### 1. Search-Based Fetching
Instead of browsing subreddits, search Reddit for specific keywords:
```typescript
// Search across all of Reddit
searchReddit('moving to Germany visa')
searchReddit('German job market salary')
searchReddit('Germany vs USA culture')
```

### 2. Multi-Subreddit Posts
Posts that appear in multiple subreddits are usually high-quality:
```typescript
// Track cross-posts
if (post.crosspost_count > 2) {
  // This is a validated gem!
}
```

### 3. Trending Detection
Fetch **rising** posts instead of top:
```typescript
// Catch viral content early
fetchSubredditPosts('Germany', 25, 'week', 'rising')
```

### 4. User-Submitted Topics
Let users request specific topics:
```typescript
// Custom topic search
generateContentFromTopic('German health insurance for expats')
generateContentFromTopic('Best cities in Germany for Indian families')
```

## Monitoring Timeframe Status

Check current timeframe for each subreddit:

```bash
npx tsx -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();

  const subs = await prisma.subreddit.findMany({
    where: { active: true },
    select: { name: true, currentTimeframe: true, lastFetched: true, postCount: true }
  });

  console.table(subs);
  await prisma.\$disconnect();
"
```

## Expected Output:
```
┌─────────┬─────────────────────┬──────────────────┬─────────────────────┬───────────┐
│ (index) │ name                │ currentTimeframe │ lastFetched         │ postCount │
├─────────┼─────────────────────┼──────────────────┼─────────────────────┼───────────┤
│ 0       │ 'Germany'           │ 'month'          │ 2025-10-23T...      │ 12        │
│ 1       │ 'IWantOut'          │ 'week'           │ 2025-10-23T...      │ 0         │
│ 2       │ 'expats'            │ 'week'           │ 2025-10-23T...      │ 8         │
│ 3       │ 'AskAGerman'        │ 'week'           │ 2025-10-23T...      │ 15        │
│ 4       │ 'cscareerquestionsEU' │ 'year'         │ 2025-10-23T...      │ 3         │
└─────────┴─────────────────────┴──────────────────┴─────────────────────┴───────────┘
```

This tells you:
- Which subreddits are running dry (escalated timeframes)
- When you last fetched
- How many posts each subreddit is generating

## Best Practices

1. **Fetch regularly**: Once per week to catch new content
2. **Monitor timeframes**: If many subreddits at "year", consider adding new subreddits
3. **Quality over quantity**: Better to have 5 gems than 50 mediocre posts
4. **Diversify subreddits**: Different perspectives = varied content
5. **Let escalation happen**: Trust the system to find good content at any timeframe
