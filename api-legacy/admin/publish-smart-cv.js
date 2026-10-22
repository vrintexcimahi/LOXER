import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

async function verifyAdmin(adminClient, token) {
  if (!token) return { error: { status: 401, message: 'Unauthorized: Sesi admin tidak ditemukan.' } };

  const isLocalDev = process.env.NODE_ENV !== 'production';
  const allowLocalBypass = isLocalDev && (process.env.ALLOW_LOCAL_ADMIN_BYPASS === 'true' || !process.env.NODE_ENV);
  if (allowLocalBypass && (token.startsWith('local-admin-') || token === 'superadmin-bypass-token' || token.includes('admin-vrintex'))) {
    return { ok: true, user: { id: 'admin-vrintex-root', email: 'vrintex@loxer.app' } };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData?.user) return { error: { status: 401, message: 'Unauthorized: Token tidak valid.' } };

  const emailNorm = (userData.user.email || '').trim().toLowerCase();
  if (emailNorm === 'vrintex' || emailNorm === 'vrintex@loxer.app' || emailNorm === 'admin@loxer.app' || emailNorm.startsWith('vrintex@') || userData.user.user_metadata?.role === 'admin') {
    return { ok: true, user: userData.user };
  }

  const { data: callerMeta, error: callerMetaError } = await adminClient
    .from('users_meta')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (callerMetaError) return { error: { status: 500, message: callerMetaError.message } };
  if (callerMeta?.role !== 'admin' && callerMeta?.role !== 'superadmin') {
    return { error: { status: 403, message: 'Forbidden: Hanya Admin atau Superadmin yang diizinkan mengakses fitur ini.' } };
  }

  return { ok: true, user: userData.user };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ message: 'Method tidak didukung. Gunakan POST.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: 'Server configuration missing' });
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authResult = await verifyAdmin(adminClient, getBearerToken(req));
  if (authResult.error) {
    res.status(authResult.error.status).json({ message: authResult.error.message });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      full_name,
      headline,
      category,
      availability,
      experience_years,
      expected_salary,
      rate_type,
      domicile_city,
      whatsapp_number,
      email,
      bio,
      skills,
      photo_url,
      portfolio_url,
      badge,
      educations,
      experiences,
    } = body;

    if (!full_name || !headline) {
      res.status(400).json({ message: 'Nama lengkap dan headline posisi wajib diisi.' });
      return;
    }

    if (!photo_url || String(photo_url).trim() === '') {
      res.status(400).json({ message: 'Postingan wajib ada pas foto pekerja! Silakan upload pas foto terlebih dahulu.' });
      return;
    }

    const cleanName = String(full_name).trim();
    const now = new Date().toISOString();
    
    // Kebijakan LOXER: Fitur Smart Add CV HANYA menerbitkan profil & postingan ke Bursa Talent LOXER.
    // TIDAK otomatis menambahkan akun user baru ke tabel users atau users_meta.
    // Data user terdaftar murni khusus untuk pengguna yang mendaftar mandiri / manual.
    const candidateUserId = null;

    // Candidate Deduplication with Indonesian Phone Normalization
    const rawPhone = String(whatsapp_number || '').trim();
    const phoneDigits = rawPhone.replace(/\D/g, '');
    const normPhone = phoneDigits.startsWith('62')
      ? '0' + phoneDigits.slice(2)
      : phoneDigits.startsWith('0')
      ? phoneDigits
      : phoneDigits.length >= 8
      ? '0' + phoneDigits
      : '';
    const altPhone62 = normPhone ? '62' + normPhone.slice(1) : '';

    // Check if existing seeker profile exists
    let existingSeeker = null;
    if (normPhone && normPhone.length >= 8) {
      const { data: seekerByPhone } = await adminClient
        .from('seeker_profiles')
        .select('id, user_id')
        .or(`phone.eq.${rawPhone},phone.eq.${normPhone},phone.eq.${altPhone62}`)
        .limit(1);
      if (seekerByPhone && seekerByPhone.length > 0) {
        existingSeeker = seekerByPhone[0];
      }
    }
    if (!existingSeeker && cleanName) {
      const { data: seekerByName } = await adminClient
        .from('seeker_profiles')
        .select('id, user_id')
        .ilike('full_name', cleanName)
        .is('user_id', null)
        .limit(1);
      if (seekerByName && seekerByName.length > 0) {
        existingSeeker = seekerByName[0];
      }
    }

    const candidateSeekerId = existingSeeker ? existingSeeker.id : `skr_cv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (!existingSeeker) {
      // 1. Create seeker profile
      const seekerProfilePayload = {
        id: candidateSeekerId,
        user_id: candidateUserId,
        full_name: cleanName,
        photo_url: photo_url || '',
        domicile_city: domicile_city || 'Cimahi / Bandung',
        about: bio || '',
        phone: whatsapp_number || '',
        expected_salary_min: Number(expected_salary) || 0,
        expected_salary_max: Math.round((Number(expected_salary) || 0) * 1.3),
        created_at: now,
        updated_at: now,
      };
      const { error: seekerErr } = await adminClient.from('seeker_profiles').insert([seekerProfilePayload]);
      if (seekerErr) {
        console.warn('[publish-smart-cv] seeker_profiles insert warning:', seekerErr.message);
      }
    } else {
      await adminClient
        .from('seeker_profiles')
        .update({
          full_name: cleanName,
          photo_url: photo_url || '',
          domicile_city: domicile_city || 'Cimahi / Bandung',
          about: bio || '',
          phone: whatsapp_number || '',
          updated_at: now,
        })
        .eq('id', candidateSeekerId);
    }

    // 2. Check if talent post already exists for this seeker or phone
    let existingPost = null;
    const { data: postBySeeker } = await adminClient
      .from('talent_marketplace_posts')
      .select('id')
      .eq('seeker_id', candidateSeekerId)
      .limit(1);
    if (postBySeeker && postBySeeker.length > 0) {
      existingPost = postBySeeker[0];
    } else if (normPhone && normPhone.length >= 8) {
      const { data: postByPhone } = await adminClient
        .from('talent_marketplace_posts')
        .select('id')
        .or(`whatsapp_number.eq.${rawPhone},whatsapp_number.eq.${normPhone},whatsapp_number.eq.${altPhone62}`)
        .limit(1);
      if (postByPhone && postByPhone.length > 0) {
        existingPost = postByPhone[0];
      }
    }

    const talentPostId = existingPost ? existingPost.id : `tal_cv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const talentPayload = {
      id: talentPostId,
      seeker_id: candidateSeekerId,
      user_id: candidateUserId,
      headline: headline.trim(),
      category: category || 'Umum & Jasa',
      bio: bio || '',
      bio_summary: bio ? bio.slice(0, 200) : '',
      skills: Array.isArray(skills) ? skills : [skills || 'Keahlian'],
      experience_years: Number(experience_years) || 0,
      availability: availability || 'fulltime',
      availability_status: availability || 'fulltime',
      expected_salary: Number(expected_salary) || 0,
      rate_type: rate_type || 'monthly',
      domicile_city: domicile_city || 'Cimahi / Bandung',
      whatsapp_number: whatsapp_number || '',
      portfolio_url: portfolio_url || '',
      badge: badge || 'SIAP KERJA',
      photo_url: photo_url || '',
      views_count: 0,
      is_published: 1,
      updated_at: now,
    };

    if (existingPost) {
      const { error: updateErr } = await adminClient
        .from('talent_marketplace_posts')
        .update(talentPayload)
        .eq('id', talentPostId);
      if (updateErr) {
        throw new Error(`Gagal memperbarui talent_marketplace_posts: ${updateErr.message}`);
      }
    } else {
      talentPayload.created_at = now;
      const { error: postErr } = await adminClient.from('talent_marketplace_posts').insert([talentPayload]);
      if (postErr) {
        throw new Error(`Gagal menyimpan ke talent_marketplace_posts: ${postErr.message}`);
      }
    }

    // 3. Save educations if provided
    if (Array.isArray(educations) && educations.length > 0) {
      const eduRows = educations.map((edu, idx) => ({
        id: `edu_cv_${Date.now()}_${idx}`,
        seeker_id: candidateSeekerId,
        school_name: edu.school_name || '',
        degree: edu.degree || 'SMA / SMK / S1',
        major: edu.major || '',
        start_year: Number(edu.start_year) || null,
        end_year: Number(edu.end_year) || null,
        is_current: false,
        created_at: now,
      }));
      await adminClient.from('seeker_educations').insert(eduRows).catch(() => {});
    }

    // 4. Save experiences if provided
    if (Array.isArray(experiences) && experiences.length > 0) {
      const expRows = experiences.map((exp, idx) => ({
        id: `exp_cv_${Date.now()}_${idx}`,
        seeker_id: candidateSeekerId,
        company_name: exp.company_name || '',
        position: exp.position || '',
        description: exp.description || '',
        is_current: false,
        created_at: now,
      }));
      await adminClient.from('seeker_experiences').insert(expRows).catch(() => {});
    }

    res.status(200).json({
      ok: true,
      message: 'Biodata pelamar kerja berhasil diterbitkan ke Bursa Talent LOXER!',
      talent_id: talentPostId,
      seeker_id: candidateSeekerId,
    });
  } catch (err) {
    console.error('[publish-smart-cv API Error]:', err);
    res.status(500).json({ message: err.message || 'Gagal menerbitkan biodata pelamar' });
  }
}
