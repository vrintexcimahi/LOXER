import * as db from '../server/localDb.js';

console.log('=== PRE-CLEANUP USERS COUNT ===');
const preUsers = db.queryAll('SELECT id, email, role FROM users_meta');
console.log('Total users_meta:', preUsers.length);
preUsers.forEach(u => console.log(` - [${u.role}] ${u.email} (${u.id})`));

console.log('\n=== UNLINKING CANDIDATES (seeker_profiles & talent_marketplace_posts) ===');
// Target dummy emails: all @gmail.com created during bulk smart CV, attacker_*, banned_*, @loxer.local
const dummyUsers = db.queryAll(`
  SELECT id, email FROM users
  WHERE email LIKE '%@gmail.com'
     OR email LIKE 'attacker_%'
     OR email LIKE 'banned_%'
     OR email LIKE '%@loxer.local'
     OR email LIKE '%example.com'
`);

console.log(`Found ${dummyUsers.length} dummy user accounts to purge.`);

const dummyIds = dummyUsers.map(u => u.id);

if (dummyIds.length > 0) {
  const placeholders = dummyIds.map(() => '?').join(',');

  // 1. Unlink seeker_profiles so candidates remain in talent pool as unlinked profiles
  db.execute(`UPDATE seeker_profiles SET user_id = NULL WHERE user_id IN (${placeholders})`, dummyIds);
  console.log('✔ seeker_profiles user_id unlinked (set to NULL).');

  // 2. Unlink talent_marketplace_posts so public talent posts remain active in Bursa Talent
  db.execute(`UPDATE talent_marketplace_posts SET user_id = NULL WHERE user_id IN (${placeholders})`, dummyIds);
  console.log('✔ talent_marketplace_posts user_id unlinked (set to NULL).');

  // 4. Delete from users_meta and users
  db.execute(`DELETE FROM users_meta WHERE id IN (${placeholders})`, dummyIds);
  console.log('✔ users_meta records deleted.');

  db.execute(`DELETE FROM users WHERE id IN (${placeholders})`, dummyIds);
  console.log('✔ users records deleted.');
}

// 3. Remove dummy ads & marketplace products
db.execute("DELETE FROM jasa_ads WHERE id LIKE 'ad-jasa-%'");
console.log('✔ Dummy jasa_ads purged.');

db.execute("DELETE FROM marketplace_products WHERE id LIKE 'prod-%'");
console.log('✔ Dummy marketplace_products purged.');

console.log('\n=== POST-CLEANUP USERS COUNT ===');
const postUsers = db.queryAll('SELECT id, email, role FROM users_meta');
console.log('Total users_meta remaining:', postUsers.length);
postUsers.forEach(u => console.log(` - [${u.role}] ${u.email} (${u.id})`));

const remainingTalent = db.queryOne('SELECT COUNT(*) as cnt FROM talent_marketplace_posts');
console.log('Total talent posts in Bursa Talent:', remainingTalent.cnt);
const nullUserTalent = db.queryOne('SELECT COUNT(*) as cnt FROM talent_marketplace_posts WHERE user_id IS NULL');
console.log('Talent posts with user_id = NULL (unlinked candidates):', nullUserTalent.cnt);
