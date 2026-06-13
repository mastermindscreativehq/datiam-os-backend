import type { DnaInputForSync, SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type { ScoreFactor, WhyScore } from './commercial-intelligence.types';

function genreMatch(genre: string | null, targets: string[]): boolean {
  if (!genre) return false;
  return targets.some(t => genre.toLowerCase().includes(t.toLowerCase()));
}

function moodMatch(mood: string | null, targets: string[]): boolean {
  if (!mood) return false;
  return targets.some(t => mood.toLowerCase().includes(t.toLowerCase()));
}

function confidenceLabel(confidence: number): WhyScore['confidenceLabel'] {
  if (confidence >= 80) return 'Very High';
  if (confidence >= 65) return 'High';
  if (confidence >= 45) return 'Moderate';
  if (confidence >= 25) return 'Low';
  return 'Very Low';
}

// ── Per-category factor evaluators ───────────────────────────────────────────

function filmTrailerFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['cinematic', 'orchestral', 'metal', 'electronic', 'rock'])
    || genreMatch(d.secondaryGenre, ['cinematic', 'orchestral', 'ambient']);
  const moodAligned = moodMatch(d.moodPrimary, ['tense', 'triumphant', 'aggressive', 'cinematic', 'dark']);
  const arcRising = d.energyArc === 'rising' || d.energyArc === 'peak';

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.tension > 65) positive.push({ label: 'High cinematic tension', description: `Tension score of ${d.tension} drives suspense and dramatic momentum`, impact: 'positive', strength: 'strong' });
  else if (d.tension < 40) negative.push({ label: 'Insufficient cinematic tension', description: `Tension score of ${d.tension} falls below the threshold required for impactful trailer placement`, impact: 'negative', strength: 'strong' });

  if (d.triumph > 65) positive.push({ label: 'Strong triumphant resolution', description: `Triumph score of ${d.triumph} delivers the payoff moment trailers require`, impact: 'positive', strength: 'strong' });
  else if (d.triumph < 45) negative.push({ label: 'Weak narrative resolution', description: `Triumph score of ${d.triumph} limits the emotional payoff expected in cinematic trailers`, impact: 'negative', strength: 'moderate' });

  if (d.aggression > 60) positive.push({ label: 'Powerful aggressive energy', description: `Aggression score of ${d.aggression} delivers the raw drive trailers demand`, impact: 'positive', strength: 'moderate' });
  else if (d.aggression < 35) negative.push({ label: 'Limited aggressive drive', description: `Aggression score of ${d.aggression} is below the intensity level expected for trailer placements`, impact: 'negative', strength: 'moderate' });

  if (arcRising) positive.push({ label: 'Escalating energy arc', description: 'Rising energy architecture builds anticipation and tension progression ideal for trailer edits', impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Non-escalating energy arc', description: `${d.energyArc ?? 'Unknown'} energy arc lacks the build progression trailers typically require`, impact: 'negative', strength: 'moderate' });

  if (d.dropStrength > 70) positive.push({ label: 'Dramatic impact moments', description: `Drop strength of ${d.dropStrength} creates the percussive punctuation editors use for key trailer beats`, impact: 'positive', strength: 'moderate' });
  else if (d.dropStrength < 40) negative.push({ label: 'Weak dynamic contrast', description: `Drop strength of ${d.dropStrength} limits the explosive moments trailer editors require`, impact: 'negative', strength: 'moderate' });

  if (d.darkness > 55) positive.push({ label: 'Dark atmospheric depth', description: `Darkness score of ${d.darkness} contributes to the cinematic weight and gravity of the track`, impact: 'positive', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Genre alignment', description: `${d.primaryGenre} maps to trailer-preferred genre conventions`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment', description: `${d.primaryGenre} is underrepresented in the trailer licensing market`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Mood profile match', description: `${d.moodPrimary} mood aligns with trailer placement expectations`, impact: 'positive', strength: 'moderate' });
  else negative.push({ label: 'Mood profile mismatch', description: `${d.moodPrimary} mood is not a primary driver for trailer sync decisions`, impact: 'negative', strength: 'weak' });

  return { positive, negative };
}

function netflixDramaFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['soul', 'r&b', 'cinematic', 'indie', 'alternative', 'neo-soul', 'jazz'])
    || genreMatch(d.secondaryGenre, ['soul', 'cinematic', 'jazz']);
  const moodAligned = moodMatch(d.moodPrimary, ['melancholic', 'romantic', 'mysterious', 'dark', 'nostalgic', 'dreamy']);

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.melancholy > 60) positive.push({ label: 'Rich melancholic emotional depth', description: `Melancholy score of ${d.melancholy} resonates with the emotional complexity streaming dramas require`, impact: 'positive', strength: 'strong' });
  else if (d.melancholy < 35) negative.push({ label: 'Limited emotional depth', description: `Melancholy score of ${d.melancholy} lacks the nuanced emotional texture streaming dramas typically feature`, impact: 'negative', strength: 'moderate' });

  if (d.romance > 55) positive.push({ label: 'Romantic emotional signature', description: `Romance score of ${d.romance} enhances intimate scene scoring potential`, impact: 'positive', strength: 'strong' });
  else if (d.romance < 35) negative.push({ label: 'Low romantic resonance', description: `Romance score of ${d.romance} reduces suitability for emotionally driven narrative scenes`, impact: 'negative', strength: 'moderate' });

  if (d.warmth > 55) positive.push({ label: 'Warm, intimate texture', description: `Warmth score of ${d.warmth} provides the sonic intimacy streaming editors favor for character moments`, impact: 'positive', strength: 'moderate' });

  if (d.spirituality > 45) positive.push({ label: 'Spiritual-emotional resonance', description: `Spirituality score of ${d.spirituality} adds emotional transcendence favored in prestige drama`, impact: 'positive', strength: 'weak' });

  if (d.tension > 45) positive.push({ label: 'Narrative tension support', description: `Tension score of ${d.tension} supports dramatic scene escalation`, impact: 'positive', strength: 'weak' });

  if (d.retention > 65) positive.push({ label: 'High replay retention', description: `Retention score of ${d.retention} indicates the track holds emotional engagement — critical for scene scoring`, impact: 'positive', strength: 'moderate' });

  if (d.aggression > 60) negative.push({ label: 'Excessive aggressive energy', description: `Aggression score of ${d.aggression} conflicts with the emotional intimacy required for streaming drama placements`, impact: 'negative', strength: 'strong' });

  if (d.danceability > 70) negative.push({ label: 'Overly rhythmic character', description: `Danceability score of ${d.danceability} reduces suitability for emotionally driven dramatic scenes`, impact: 'negative', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Genre alignment with streaming drama', description: `${d.primaryGenre} is a preferred genre for streaming drama sync`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment', description: `${d.primaryGenre} is not commonly featured in streaming drama placements`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Mood profile match', description: `${d.moodPrimary} mood aligns with Netflix/streaming drama placement expectations`, impact: 'positive', strength: 'moderate' });

  return { positive, negative };
}

function documentaryFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['ambient', 'classical', 'folk', 'world music', 'orchestral', 'cinematic', 'jazz'])
    || genreMatch(d.secondaryGenre, ['ambient', 'folk', 'world', 'classical']);
  const moodAligned = moodMatch(d.moodPrimary, ['peaceful', 'spiritual', 'mysterious', 'melancholic', 'dreamy', 'nostalgic']);

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.spirituality > 55) positive.push({ label: 'Spiritual-contemplative quality', description: `Spirituality score of ${d.spirituality} supports documentary storytelling and reflective moments`, impact: 'positive', strength: 'strong' });
  else if (d.spirituality < 30) negative.push({ label: 'Low contemplative depth', description: `Spirituality score of ${d.spirituality} reduces suitability for reflective documentary scoring`, impact: 'negative', strength: 'moderate' });

  if (d.warmth > 50) positive.push({ label: 'Warm, human texture', description: `Warmth score of ${d.warmth} creates the approachable tone documentary filmmakers favor`, impact: 'positive', strength: 'moderate' });

  if (d.aggression < 35) positive.push({ label: 'Non-aggressive profile', description: `Low aggression (${d.aggression}) maintains the measured tone documentaries require`, impact: 'positive', strength: 'strong' });
  else if (d.aggression > 55) negative.push({ label: 'Elevated aggression', description: `Aggression score of ${d.aggression} disrupts the measured emotional tone documentary editors prefer`, impact: 'negative', strength: 'strong' });

  if (d.melancholy > 40) positive.push({ label: 'Contemplative melancholic quality', description: `Melancholy score of ${d.melancholy} adds emotional gravity appropriate for documentary storytelling`, impact: 'positive', strength: 'moderate' });

  if (d.danceability < 50) positive.push({ label: 'Non-rhythmic character', description: `Low danceability (${d.danceability}) supports documentary's non-commercial sonic requirement`, impact: 'positive', strength: 'moderate' });
  else if (d.danceability > 65) negative.push({ label: 'Overly rhythmic for documentary', description: `Danceability score of ${d.danceability} makes the track feel too commercial for documentary contexts`, impact: 'negative', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Genre alignment with documentary', description: `${d.primaryGenre} is a commonly licensed genre in documentary productions`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment', description: `${d.primaryGenre} is less common in documentary sync licensing`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Mood profile match', description: `${d.moodPrimary} mood is well-suited for documentary emotional arcs`, impact: 'positive', strength: 'moderate' });

  return { positive, negative };
}

function sportsContentFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['hip-hop', 'trap', 'metal', 'rock', 'dance', 'edm', 'drum & bass', 'punk', 'afrobeats'])
    || genreMatch(d.secondaryGenre, ['hip-hop', 'rock', 'metal', 'trap']);
  const moodAligned = moodMatch(d.moodPrimary, ['triumphant', 'aggressive', 'confident', 'euphoric', 'uplifting']);
  const arcDriving = d.energyArc === 'rising' || d.energyArc === 'steady';

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.danceability > 70) positive.push({ label: 'High rhythmic drive', description: `Danceability score of ${d.danceability} delivers the groove and momentum sports content demands`, impact: 'positive', strength: 'strong' });
  else if (d.danceability < 50) negative.push({ label: 'Low rhythmic energy', description: `Danceability score of ${d.danceability} lacks the kinetic drive sports media requires`, impact: 'negative', strength: 'strong' });

  if (d.aggression > 65) positive.push({ label: 'Powerful aggressive energy', description: `Aggression score of ${d.aggression} delivers the raw intensity sports brands and broadcasters seek`, impact: 'positive', strength: 'strong' });
  else if (d.aggression < 45) negative.push({ label: 'Insufficient aggression for sports', description: `Aggression score of ${d.aggression} falls below the intensity sports content requires`, impact: 'negative', strength: 'moderate' });

  if (d.triumph > 65) positive.push({ label: 'Strong motivational signature', description: `Triumph score of ${d.triumph} provides the achievement and victory narrative sports content thrives on`, impact: 'positive', strength: 'strong' });
  else if (d.triumph < 50) negative.push({ label: 'Weak motivational presence', description: `Triumph score of ${d.triumph} limits the motivational arc sports media relies on`, impact: 'negative', strength: 'strong' });

  if (d.brightness > 60) positive.push({ label: 'High positive emotional profile', description: `Brightness score of ${d.brightness} creates the uplifting energy that enhances athlete and brand storytelling`, impact: 'positive', strength: 'moderate' });

  if (arcDriving) positive.push({ label: 'Consistent driving energy', description: `${d.energyArc} energy arc maintains the momentum sports edits require throughout the cut`, impact: 'positive', strength: 'moderate' });
  else negative.push({ label: 'Inconsistent energy arc', description: `${d.energyArc ?? 'Unknown'} energy arc may not sustain the momentum required for sports content`, impact: 'negative', strength: 'weak' });

  if (d.dropStrength > 65) positive.push({ label: 'Strong impact moments', description: `Drop strength of ${d.dropStrength} creates the punctuation beats that align with highlight reel editing`, impact: 'positive', strength: 'moderate' });

  if (d.darkness > 65) negative.push({ label: 'Excessive dark tonality', description: `Darkness score of ${d.darkness} conflicts with the positive-energy profile most sports brands require`, impact: 'negative', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Genre alignment with sports content', description: `${d.primaryGenre} is a primary genre in sports media and athlete branding`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment', description: `${d.primaryGenre} is underrepresented in sports content sync licensing`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Motivational mood profile', description: `${d.moodPrimary} mood supports athlete branding and competitive sports narratives`, impact: 'positive', strength: 'moderate' });
  else negative.push({ label: 'Mood profile mismatch', description: `${d.moodPrimary} mood is not the primary driver for sports sync placements`, impact: 'negative', strength: 'weak' });

  return { positive, negative };
}

function gamingFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['electronic', 'edm', 'metal', 'drum & bass', 'techno', 'dubstep', 'trap', 'rock'])
    || genreMatch(d.secondaryGenre, ['electronic', 'metal', 'drum & bass', 'techno']);
  const moodAligned = moodMatch(d.moodPrimary, ['tense', 'aggressive', 'dark', 'triumphant', 'mysterious', 'euphoric']);

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.tension > 60) positive.push({ label: 'High tension profile', description: `Tension score of ${d.tension} supports immersive gameplay and combat scenarios`, impact: 'positive', strength: 'strong' });
  else if (d.tension < 40) negative.push({ label: 'Insufficient tension', description: `Tension score of ${d.tension} limits suitability for action-oriented gameplay sequences`, impact: 'negative', strength: 'moderate' });

  if (d.aggression > 60) positive.push({ label: 'Aggressive energy profile', description: `Aggression score of ${d.aggression} drives intensity for combat and competitive gaming sequences`, impact: 'positive', strength: 'strong' });
  else if (d.aggression < 40) negative.push({ label: 'Low aggression for gaming', description: `Aggression score of ${d.aggression} reduces suitability for action-driven gaming contexts`, impact: 'negative', strength: 'moderate' });

  if (d.darkness > 55) positive.push({ label: 'Dark atmospheric depth', description: `Darkness score of ${d.darkness} supports immersive world-building and atmospheric game scoring`, impact: 'positive', strength: 'strong' });

  if (d.danceability > 60) positive.push({ label: 'Rhythmic momentum', description: `Danceability score of ${d.danceability} maintains engagement in open-world and exploration sequences`, impact: 'positive', strength: 'moderate' });

  if (d.triumph > 55) positive.push({ label: 'Triumph and achievement signals', description: `Triumph score of ${d.triumph} supports victory sequences and level-completion moments`, impact: 'positive', strength: 'moderate' });

  if (d.volatility > 65) positive.push({ label: 'Dynamic energy volatility', description: `Energy volatility of ${d.volatility} provides the unpredictable momentum gaming experiences benefit from`, impact: 'positive', strength: 'moderate' });

  if (d.warmth > 60) negative.push({ label: 'Excessive warmth for gaming', description: `Warmth score of ${d.warmth} creates a softer texture that conflicts with most gaming environments`, impact: 'negative', strength: 'weak' });

  if (d.romance > 55) negative.push({ label: 'Romantic profile misalignment', description: `Romance score of ${d.romance} reduces suitability for most gaming contexts outside narrative RPGs`, impact: 'negative', strength: 'weak' });

  if (genreAligned) positive.push({ label: 'Genre alignment with gaming', description: `${d.primaryGenre} is a primary genre in game soundtrack licensing`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment with gaming', description: `${d.primaryGenre} is less commonly licensed for gaming contexts`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Gaming mood profile', description: `${d.moodPrimary} mood aligns with gaming atmosphere requirements`, impact: 'positive', strength: 'moderate' });

  return { positive, negative };
}

function fashionFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['pop', 'dance', 'edm', 'house', 'r&b', 'electronic'])
    || genreMatch(d.secondaryGenre, ['pop', 'house', 'r&b', 'electronic']);
  const moodAligned = moodMatch(d.moodPrimary, ['confident', 'euphoric', 'romantic', 'playful', 'uplifting']);

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.brightness > 60) positive.push({ label: 'High brightness profile', description: `Brightness score of ${d.brightness} delivers the visual-sonic energy fashion editorials and runway shows demand`, impact: 'positive', strength: 'strong' });
  else if (d.brightness < 40) negative.push({ label: 'Low brightness for fashion', description: `Brightness score of ${d.brightness} lacks the editorial energy fashion brands require`, impact: 'negative', strength: 'strong' });

  if (d.danceability > 60) positive.push({ label: 'Editorial rhythmic drive', description: `Danceability score of ${d.danceability} provides the groove fashion content needs for movement and performance`, impact: 'positive', strength: 'strong' });
  else if (d.danceability < 45) negative.push({ label: 'Insufficient rhythmic energy', description: `Danceability score of ${d.danceability} limits suitability for fashion video and runway applications`, impact: 'negative', strength: 'moderate' });

  if (d.romance > 50) positive.push({ label: 'Romantic aesthetic quality', description: `Romance score of ${d.romance} aligns with fashion's aspirational and sensual brand identity`, impact: 'positive', strength: 'moderate' });

  if (d.triumph > 50) positive.push({ label: 'Confident, triumphant tone', description: `Triumph score of ${d.triumph} supports the aspirational narrative fashion campaigns project`, impact: 'positive', strength: 'moderate' });

  if (d.darkness < 45) positive.push({ label: 'Minimal dark tonality', description: `Low darkness (${d.darkness}) maintains the elevated, aspirational aesthetic fashion requires`, impact: 'positive', strength: 'moderate' });
  else if (d.darkness > 65) negative.push({ label: 'Excessive dark atmosphere', description: `Darkness score of ${d.darkness} conflicts with fashion's predominantly aspirational visual tone`, impact: 'negative', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Genre alignment with fashion', description: `${d.primaryGenre} is a highly preferred genre in fashion sync licensing`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment with fashion', description: `${d.primaryGenre} is underrepresented in fashion editorial and runway sync`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Fashion mood profile', description: `${d.moodPrimary} mood supports fashion's visual storytelling and brand identity`, impact: 'positive', strength: 'moderate' });

  return { positive, negative };
}

function luxuryBrandsFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['classical', 'orchestral', 'jazz', 'ambient', 'neo-soul', 'soul', 'cinematic'])
    || genreMatch(d.secondaryGenre, ['classical', 'jazz', 'orchestral', 'ambient']);
  const moodAligned = moodMatch(d.moodPrimary, ['romantic', 'spiritual', 'peaceful', 'mysterious', 'nostalgic', 'dreamy']);

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.warmth > 60) positive.push({ label: 'Rich, warm texture', description: `Warmth score of ${d.warmth} delivers the premium sonic quality luxury brands require`, impact: 'positive', strength: 'strong' });
  else if (d.warmth < 40) negative.push({ label: 'Insufficient warmth for luxury', description: `Warmth score of ${d.warmth} lacks the premium sonic texture luxury brand campaigns require`, impact: 'negative', strength: 'strong' });

  if (d.romance > 50) positive.push({ label: 'Romantic, aspirational quality', description: `Romance score of ${d.romance} enhances the aspirational storytelling luxury brands use to sell desire`, impact: 'positive', strength: 'strong' });
  else if (d.romance < 35) negative.push({ label: 'Low romantic resonance', description: `Romance score of ${d.romance} limits suitability for luxury brand emotional storytelling`, impact: 'negative', strength: 'moderate' });

  if (d.spirituality > 45) positive.push({ label: 'Transcendent spiritual quality', description: `Spirituality score of ${d.spirituality} adds the elevated, otherworldly quality luxury brands communicate`, impact: 'positive', strength: 'moderate' });

  if (d.aggression < 35) positive.push({ label: 'Non-aggressive profile', description: `Low aggression (${d.aggression}) maintains the refined, premium character luxury brands require`, impact: 'positive', strength: 'strong' });
  else if (d.aggression > 50) negative.push({ label: 'Elevated aggression', description: `Aggression score of ${d.aggression} conflicts with the sophistication luxury brand campaigns communicate`, impact: 'negative', strength: 'strong' });

  if (d.danceability < 45) positive.push({ label: 'Measured rhythmic restraint', description: `Low danceability (${d.danceability}) maintains the refined pacing luxury brands prefer`, impact: 'positive', strength: 'moderate' });
  else if (d.danceability > 65) negative.push({ label: 'Overly rhythmic for luxury', description: `Danceability score of ${d.danceability} conflicts with the premium, understated luxury aesthetic`, impact: 'negative', strength: 'moderate' });

  if (d.tension < 40) positive.push({ label: 'Low tension maintains elegance', description: `Low tension (${d.tension}) preserves the serene, premium atmosphere luxury brands use`, impact: 'positive', strength: 'moderate' });
  else if (d.tension > 55) negative.push({ label: 'Tension disrupts luxury feel', description: `Tension score of ${d.tension} creates a sense of urgency that conflicts with luxury brand calm`, impact: 'negative', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Genre alignment with luxury brands', description: `${d.primaryGenre} is a premium genre in luxury brand sync licensing`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment with luxury', description: `${d.primaryGenre} is not commonly featured in luxury brand campaigns`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Luxury mood profile', description: `${d.moodPrimary} mood aligns with luxury brand emotional storytelling`, impact: 'positive', strength: 'moderate' });

  return { positive, negative };
}

function travelCampaignFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['folk', 'world music', 'afrobeats', 'reggae', 'latin', 'pop', 'indie', 'country'])
    || genreMatch(d.secondaryGenre, ['folk', 'world music', 'afrobeats', 'latin', 'reggae']);
  const moodAligned = moodMatch(d.moodPrimary, ['euphoric', 'uplifting', 'peaceful', 'triumphant', 'playful', 'dreamy']);

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.brightness > 60) positive.push({ label: 'High brightness and positivity', description: `Brightness score of ${d.brightness} delivers the sunlit, adventurous quality travel campaigns project`, impact: 'positive', strength: 'strong' });
  else if (d.brightness < 40) negative.push({ label: 'Low brightness for travel', description: `Brightness score of ${d.brightness} lacks the optimistic, exploratory energy travel campaigns require`, impact: 'negative', strength: 'strong' });

  if (d.spirituality > 55) positive.push({ label: 'Spiritual-exploratory quality', description: `Spirituality score of ${d.spirituality} adds the sense of discovery and transcendence travel brands communicate`, impact: 'positive', strength: 'strong' });

  if (d.warmth > 55) positive.push({ label: 'Warm, inviting texture', description: `Warmth score of ${d.warmth} creates the welcoming, comfortable feeling travel advertising relies on`, impact: 'positive', strength: 'moderate' });

  if (d.triumph > 50) positive.push({ label: 'Triumphant adventure narrative', description: `Triumph score of ${d.triumph} supports the journey-and-achievement narrative travel brands tell`, impact: 'positive', strength: 'moderate' });

  if (d.danceability > 50) positive.push({ label: 'Rhythmic movement energy', description: `Danceability score of ${d.danceability} creates the kinetic energy that visually motivates travel`, impact: 'positive', strength: 'moderate' });

  if (d.retention > 60) positive.push({ label: 'Strong listener retention', description: `Retention score of ${d.retention} keeps audiences engaged throughout travel content`, impact: 'positive', strength: 'moderate' });

  if (d.tension > 60) negative.push({ label: 'Elevated tension conflicts with travel', description: `Tension score of ${d.tension} creates unease that conflicts with travel's aspirational, escapist tone`, impact: 'negative', strength: 'moderate' });

  if (d.darkness > 55) negative.push({ label: 'Dark atmosphere limits appeal', description: `Darkness score of ${d.darkness} conflicts with travel advertising's optimistic, sun-filled visual identity`, impact: 'negative', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Genre alignment with travel content', description: `${d.primaryGenre} is strongly associated with travel and discovery media`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment with travel', description: `${d.primaryGenre} is less commonly featured in travel campaign licensing`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Travel mood profile', description: `${d.moodPrimary} mood supports the wanderlust and adventure narrative travel brands sell`, impact: 'positive', strength: 'moderate' });

  return { positive, negative };
}

function commercialAdsFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['pop', 'dance', 'edm', 'house', 'r&b', 'soul', 'hip-hop'])
    || genreMatch(d.secondaryGenre, ['pop', 'house', 'r&b', 'soul']);
  const moodAligned = moodMatch(d.moodPrimary, ['uplifting', 'playful', 'confident', 'euphoric', 'romantic']);

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.danceability > 60) positive.push({ label: 'High commercial rhythmic appeal', description: `Danceability score of ${d.danceability} drives the consumer engagement that advertising campaigns require`, impact: 'positive', strength: 'strong' });
  else if (d.danceability < 45) negative.push({ label: 'Low rhythmic appeal for advertising', description: `Danceability score of ${d.danceability} limits mass consumer engagement potential`, impact: 'negative', strength: 'strong' });

  if (d.brightness > 55) positive.push({ label: 'Positive, bright emotional profile', description: `Brightness score of ${d.brightness} creates the feel-good energy mass-market advertising deploys`, impact: 'positive', strength: 'strong' });
  else if (d.brightness < 40) negative.push({ label: 'Insufficient brightness for ads', description: `Brightness score of ${d.brightness} lacks the positive energy consumer advertising requires`, impact: 'negative', strength: 'moderate' });

  if (d.triumph > 55) positive.push({ label: 'Triumphant consumer narrative', description: `Triumph score of ${d.triumph} delivers the aspirational payoff consumer brands use to drive purchase intent`, impact: 'positive', strength: 'moderate' });

  if (d.romance > 45) positive.push({ label: 'Romantic appeal', description: `Romance score of ${d.romance} enhances lifestyle and aspirational advertising narratives`, impact: 'positive', strength: 'moderate' });

  if (d.retention > 65) positive.push({ label: 'High listener retention', description: `Retention score of ${d.retention} ensures the brand message is absorbed throughout the ad`, impact: 'positive', strength: 'moderate' });

  if (d.tension > 55) negative.push({ label: 'Tension disrupts consumer comfort', description: `Tension score of ${d.tension} creates discomfort that commercial advertising typically avoids`, impact: 'negative', strength: 'moderate' });

  if (d.darkness > 55) negative.push({ label: 'Dark atmosphere limits ad suitability', description: `Darkness score of ${d.darkness} conflicts with the predominantly positive emotional tone mass advertising requires`, impact: 'negative', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Genre alignment with commercial advertising', description: `${d.primaryGenre} is a dominant genre in commercial advertising sync`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment with advertising', description: `${d.primaryGenre} is less common in mass-market advertising licensing`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Commercial mood profile', description: `${d.moodPrimary} mood is a strong driver of consumer advertising placements`, impact: 'positive', strength: 'moderate' });

  return { positive, negative };
}

function socialContentFactors(d: DnaInputForSync) {
  const genreAligned = genreMatch(d.primaryGenre, ['hip-hop', 'trap', 'pop', 'dance', 'edm', 'afrobeats', 'r&b', 'lo-fi', 'dancehall'])
    || genreMatch(d.secondaryGenre, ['hip-hop', 'trap', 'pop', 'afrobeats']);
  const moodAligned = moodMatch(d.moodPrimary, ['euphoric', 'playful', 'confident', 'uplifting', 'aggressive', 'triumphant']);

  const positive: ScoreFactor[] = [];
  const negative: ScoreFactor[] = [];

  if (d.danceability > 65) positive.push({ label: 'Viral dance and movement energy', description: `Danceability score of ${d.danceability} drives the social media trend cycles that fuel viral licensing`, impact: 'positive', strength: 'strong' });
  else if (d.danceability < 50) negative.push({ label: 'Low viral movement potential', description: `Danceability score of ${d.danceability} limits suitability for TikTok, Reels, and trend-driven social placements`, impact: 'negative', strength: 'strong' });

  if (d.brightness > 60) positive.push({ label: 'High positive energy for social', description: `Brightness score of ${d.brightness} creates the feel-good, shareable energy social content algorithms reward`, impact: 'positive', strength: 'strong' });
  else if (d.brightness < 45) negative.push({ label: 'Low brightness for social content', description: `Brightness score of ${d.brightness} limits viral potential on positivity-driven social platforms`, impact: 'negative', strength: 'moderate' });

  if (d.triumph > 55) positive.push({ label: 'Achievement and confidence narrative', description: `Triumph score of ${d.triumph} supports the self-expression and achievement culture of social media`, impact: 'positive', strength: 'moderate' });

  if (d.aggression > 55) positive.push({ label: 'High-energy social potential', description: `Aggression score of ${d.aggression} drives the intensity and edge social media audiences engage with`, impact: 'positive', strength: 'moderate' });

  if (d.dropStrength > 60) positive.push({ label: 'Strong hook and drop moments', description: `Drop strength of ${d.dropStrength} creates the viral punctuation moments social content creators need`, impact: 'positive', strength: 'strong' });
  else if (d.dropStrength < 35) negative.push({ label: 'Weak hook moments', description: `Drop strength of ${d.dropStrength} limits the viral punctuation that social content algorithms amplify`, impact: 'negative', strength: 'moderate' });

  if (d.volatility > 60) positive.push({ label: 'Dynamic energy variation', description: `Energy volatility of ${d.volatility} creates the varied, engaging experience social platforms reward`, impact: 'positive', strength: 'moderate' });

  if (d.melancholy > 65) negative.push({ label: 'High melancholy limits viral reach', description: `Melancholy score of ${d.melancholy} reduces the positive, shareable energy social platforms reward most`, impact: 'negative', strength: 'moderate' });

  if (genreAligned) positive.push({ label: 'Viral genre alignment', description: `${d.primaryGenre} is a top-performing genre in social media content and UGC licensing`, impact: 'positive', strength: 'strong' });
  else negative.push({ label: 'Genre misalignment with social content', description: `${d.primaryGenre} has lower viral traction on major social platforms`, impact: 'negative', strength: 'moderate' });

  if (moodAligned) positive.push({ label: 'Social-first mood profile', description: `${d.moodPrimary} mood drives the emotional engagement social content creators and audiences seek`, impact: 'positive', strength: 'moderate' });

  return { positive, negative };
}

// ── Factory ────────────────────────────────────────────────────────────────────

const FACTOR_EVALUATORS: Record<SyncCategory, (d: DnaInputForSync) => { positive: ScoreFactor[]; negative: ScoreFactor[] }> = {
  film_trailer:     filmTrailerFactors,
  netflix_drama:    netflixDramaFactors,
  documentary:      documentaryFactors,
  sports_content:   sportsContentFactors,
  gaming:           gamingFactors,
  fashion:          fashionFactors,
  luxury_brands:    luxuryBrandsFactors,
  travel_campaigns: travelCampaignFactors,
  commercial_ads:   commercialAdsFactors,
  social_content:   socialContentFactors,
};

// ── Public API ────────────────────────────────────────────────────────────────

export function buildWhyScores(
  d: DnaInputForSync,
  categoryScores: Record<SyncCategory, CategoryScore>,
): WhyScore[] {
  return (Object.keys(FACTOR_EVALUATORS) as SyncCategory[]).map(cat => {
    const { positive, negative } = FACTOR_EVALUATORS[cat](d);
    const scoreData = categoryScores[cat];

    return {
      category: cat,
      label: SYNC_CATEGORY_LABELS[cat],
      score: scoreData.score,
      confidence: scoreData.confidence,
      positiveFactors: positive,
      negativeFactors: negative,
      confidenceLabel: confidenceLabel(scoreData.confidence),
    };
  });
}
