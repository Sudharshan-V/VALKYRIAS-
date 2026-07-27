import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const EXECUTE_CONFIRMATION = 'DELETE_ALL_EXISTING_VALKYRIAS_USERS';
const ROW_PAGE_SIZE = 1000;
const AUTH_PAGE_SIZE = 1000;
const STORAGE_PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;
const MAX_PAGES = 10_000;
const MAX_STORAGE_OBJECTS = 200_000;

const DELETE_TABLE_SPECS = [
  {
    name: 'message_reads',
    select: 'message_id,user_id',
    deleteKey: 'message_id',
    reportFields: ['message_id', 'user_id'],
  },
  {
    name: 'file_records',
    select: 'id,order_id,conversation_id,message_id,uploaded_by,storage_bucket,storage_path,deleted_at',
    deleteKey: 'id',
    reportFields: ['id', 'order_id', 'uploaded_by'],
  },
  {
    name: 'revision_requests',
    select: 'id,order_id,requested_by',
    deleteKey: 'id',
    reportFields: ['id', 'order_id', 'requested_by'],
  },
  {
    name: 'payments',
    select: 'id,order_id,client_id',
    deleteKey: 'id',
    reportFields: ['id', 'order_id', 'client_id'],
  },
  {
    name: 'reviews',
    select: 'id,order_id,client_id,editor_id',
    deleteKey: 'id',
    reportFields: ['id', 'order_id', 'client_id', 'editor_id'],
  },
  {
    name: 'order_events',
    select: 'id,order_id,actor_id',
    deleteKey: 'id',
    reportFields: ['id', 'order_id', 'actor_id'],
  },
  {
    name: 'notifications',
    select: 'id,user_id,order_id',
    deleteKey: 'id',
    reportFields: ['id', 'user_id', 'order_id'],
  },
  {
    name: 'conversation_messages',
    select: 'id,conversation_id,sender_id',
    deleteKey: 'id',
    reportFields: ['id', 'conversation_id', 'sender_id'],
  },
  {
    name: 'conversation_participants',
    select: 'conversation_id,user_id',
    deleteKey: 'conversation_id',
    reportFields: ['conversation_id', 'user_id'],
  },
  {
    name: 'order_assignments',
    select: 'id,order_id,editor_id,assigned_by',
    deleteKey: 'id',
    reportFields: ['id', 'order_id', 'editor_id', 'assigned_by'],
  },
  {
    name: 'order_requirements',
    select: 'id,order_id',
    deleteKey: 'id',
    reportFields: ['id', 'order_id'],
  },
  {
    name: 'conversations',
    select: 'id,order_id',
    deleteKey: 'id',
    reportFields: ['id', 'order_id'],
  },
  {
    name: 'orders',
    select: 'id,client_id,assigned_editor_id',
    deleteKey: 'id',
    reportFields: ['id', 'client_id', 'assigned_editor_id'],
  },
  {
    name: 'editor_profile_skills',
    select: 'user_id,skill',
    deleteKey: 'user_id',
    reportFields: ['user_id', 'skill'],
  },
  {
    name: 'editor_profile_software',
    select: 'user_id,software',
    deleteKey: 'user_id',
    reportFields: ['user_id', 'software'],
  },
  {
    name: 'editor_profile_languages',
    select: 'user_id,language',
    deleteKey: 'user_id',
    reportFields: ['user_id', 'language'],
  },
  {
    name: 'editor_profile_certifications',
    select: 'user_id,certification',
    deleteKey: 'user_id',
    reportFields: ['user_id', 'certification'],
  },
  {
    name: 'client_profiles',
    select: 'user_id',
    deleteKey: 'user_id',
    reportFields: ['user_id'],
  },
  {
    name: 'editor_profiles',
    select: 'user_id',
    deleteKey: 'user_id',
    reportFields: ['user_id'],
  },
  {
    name: 'messages',
    select: '*',
    deleteKeyCandidates: ['id'],
    reportFields: ['id', 'thread_id', 'author_id', 'sender_id', 'user_id'],
    optionalLegacy: true,
  },
  {
    name: 'threads',
    select: '*',
    deleteKeyCandidates: ['id'],
    reportFields: ['id', 'user_id', 'client_id', 'editor_id'],
    optionalLegacy: true,
  },
  {
    name: 'chat_messages',
    select: 'id,user_id',
    deleteKey: 'id',
    reportFields: ['id', 'user_id'],
  },
  {
    name: 'deliverables',
    select: 'id,user_id,thumbnail',
    deleteKey: 'id',
    reportFields: ['id', 'user_id'],
  },
  {
    name: 'action_items',
    select: 'id,user_id',
    deleteKey: 'id',
    reportFields: ['id', 'user_id'],
  },
  {
    name: 'portfolio_items',
    select: 'id,user_id,image',
    deleteKey: 'id',
    reportFields: ['id', 'user_id'],
  },
  {
    name: 'notes',
    select: 'id,user_id',
    deleteKey: 'id',
    reportFields: ['id', 'user_id'],
  },
  {
    name: 'projects',
    select: 'id,user_id,thumbnail',
    deleteKey: 'id',
    reportFields: ['id', 'user_id'],
  },
  {
    name: 'app_settings',
    select: 'id',
    deleteKey: 'id',
    reportFields: ['id'],
  },
  {
    name: 'profiles',
    select: '*',
    deleteKeyCandidates: ['user_id', 'id'],
    reportFields: ['user_id', 'id'],
    optionalLegacy: true,
  },
  {
    name: 'users',
    select: 'id,supabase_user_id,email,profile_image_path',
    deleteKey: 'id',
    reportFields: ['id', 'supabase_user_id', 'email'],
  },
];

const PRESERVED_TABLE_SPECS = [
  {
    name: 'services',
    select: 'id',
    reportFields: ['id'],
    reason: 'service catalog',
  },
  {
    name: 'service_packages',
    select: 'id,service_id',
    reportFields: ['id', 'service_id'],
    reason: 'service catalog packages',
  },
  {
    name: 'plans',
    select: 'id,user_id',
    reportFields: ['id', 'user_id'],
    reason: 'explicitly preserved by the cleanup request',
    blocksAuthDeletionWhenNonEmpty: true,
  },
  {
    name: 'contact_messages',
    select: 'id',
    reportFields: ['id'],
    reason: 'not explicitly linked to a user by a foreign key',
  },
];

function usage() {
  return [
    'Usage:',
    '  node scripts/delete-existing-users.mjs --dry-run',
    '  node scripts/delete-existing-users.mjs --execute',
    '',
    'Default mode: --dry-run',
    '',
    'Required server-only environment variables:',
    '  SUPABASE_URL',
    '  SUPABASE_SERVICE_ROLE_KEY',
    '  EXPECTED_SUPABASE_PROJECT_REF',
    '',
    'Execution also requires:',
    `  DELETE_USERS_CONFIRMATION=${EXECUTE_CONFIRMATION}`,
    '',
    'This script never loads browser .env files and never deletes bucket definitions.',
  ].join('\n');
}

function parseMode(argv) {
  const supported = new Set(['--dry-run', '--execute', '--help']);
  const unknown = argv.filter((argument) => !supported.has(argument));
  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
  }

  if (argv.includes('--help')) {
    if (argv.length !== 1) {
      throw new Error('--help cannot be combined with another argument.');
    }
    return 'help';
  }

  if (argv.includes('--dry-run') && argv.includes('--execute')) {
    throw new Error('--dry-run and --execute cannot be combined.');
  }

  if (argv.filter((argument) => argument === '--execute').length > 1
      || argv.filter((argument) => argument === '--dry-run').length > 1) {
    throw new Error('Specify the selected mode only once.');
  }

  return argv.includes('--execute') ? 'execute' : 'dry-run';
}

function requireNode22() {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (!Number.isFinite(major) || major < 22) {
    throw new Error(`Node.js 22 or newer is required; detected ${process.versions.node}.`);
  }
}

function readConfiguration(mode) {
  const requiredNames = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'EXPECTED_SUPABASE_PROJECT_REF',
  ];
  const missing = requiredNames.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required server-only environment variable(s): ${missing.join(', ')}.`);
  }

  if (mode === 'execute' && process.env.DELETE_USERS_CONFIRMATION !== EXECUTE_CONFIRMATION) {
    throw new Error(
      `Execution refused: DELETE_USERS_CONFIRMATION must exactly equal ${EXECUTE_CONFIRMATION}.`,
    );
  }

  const expectedProjectRef = process.env.EXPECTED_SUPABASE_PROJECT_REF.trim().toLowerCase();
  if (!/^[a-z0-9]{20}$/.test(expectedProjectRef)) {
    throw new Error('EXPECTED_SUPABASE_PROJECT_REF must be the 20-character Supabase project reference.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(process.env.SUPABASE_URL.trim());
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL.');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('SUPABASE_URL must use HTTPS.');
  }
  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    throw new Error('SUPABASE_URL must not contain credentials, query parameters, or a fragment.');
  }
  if (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') {
    throw new Error('SUPABASE_URL must be the project root URL, not a REST or Storage endpoint.');
  }

  const expectedHost = `${expectedProjectRef}.supabase.co`;
  if (parsedUrl.hostname.toLowerCase() !== expectedHost) {
    throw new Error(
      `Project verification failed: SUPABASE_URL host does not match EXPECTED_SUPABASE_PROJECT_REF (${expectedProjectRef}).`,
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  assertServerKey(serviceRoleKey);

  return {
    mode,
    expectedProjectRef,
    projectUrl: `https://${expectedHost}`,
    serviceRoleKey,
    profileBucket: process.env.SUPABASE_PROFILE_BUCKET?.trim() || 'profile-avatars',
    orderFilesBucket: process.env.SUPABASE_ORDER_FILES_BUCKET?.trim() || 'order-files',
  };
}

function assertServerKey(key) {
  if (key.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY contains a publishable browser key, not a server key.');
  }

  const segments = key.split('.');
  if (segments.length !== 3) {
    return;
  }

  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
    if (payload.role !== 'service_role') {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY JWT does not have the service_role claim.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('service_role')) {
      throw error;
    }
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not a valid server key.');
  }
}

function createAdminClient(configuration) {
  return createClient(configuration.projectUrl, configuration.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'valkyrias-user-cleanup/1.0',
      },
    },
  });
}

function isMissingTable(error) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || (message.includes('could not find the table') && message.includes('schema cache'))
    || message.includes('relation does not exist');
}

function sanitizedError(error, secrets = []) {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets.filter(Boolean)) {
    message = message.split(secret).join('[REDACTED]');
  }
  message = message.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]');
  return {
    name: error?.name ?? 'Error',
    message,
    code: error?.code ?? null,
    status: error?.status ?? null,
  };
}

function operationError(operation, resource, error) {
  const wrapped = new Error(`${operation} failed for ${resource}: ${error?.message ?? String(error)}`);
  wrapped.name = 'CleanupOperationError';
  wrapped.code = error?.code;
  wrapped.status = error?.status;
  return wrapped;
}

async function listAuthUsers(client) {
  const usersById = new Map();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });
    if (error) {
      throw operationError('Auth Admin listUsers', `page ${page}`, error);
    }

    const users = data?.users ?? [];
    for (const user of users) {
      if (!user?.id) {
        throw new Error(`Auth Admin listUsers returned a user without an ID on page ${page}.`);
      }
      usersById.set(user.id, {
        id: user.id,
        email: user.email ?? null,
      });
    }

    if (users.length < AUTH_PAGE_SIZE) {
      return [...usersById.values()].sort(compareByJson);
    }
  }

  throw new Error(`Auth pagination exceeded the safety limit of ${MAX_PAGES} pages.`);
}

async function readTable(client, spec) {
  const rows = [];
  let exactCount = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * ROW_PAGE_SIZE;
    const to = from + ROW_PAGE_SIZE - 1;
    const { data, error, count } = await client
      .from(spec.name)
      .select(spec.select, { count: 'exact' })
      .range(from, to);

    if (error) {
      if (isMissingTable(error)) {
        return {
          spec,
          status: 'absent',
          count: 0,
          rows: [],
          deleteKey: spec.deleteKey ?? spec.deleteKeyCandidates?.[0] ?? null,
        };
      }
      throw operationError('read-only table audit', `public.${spec.name}`, error);
    }

    if (exactCount === null) {
      exactCount = count;
    }
    const pageRows = data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < ROW_PAGE_SIZE || (exactCount !== null && rows.length >= exactCount)) {
      const deleteKey = resolveDeleteKey(spec, rows);
      if (exactCount !== null && rows.length !== exactCount) {
        throw new Error(
          `Count changed while auditing public.${spec.name}; expected ${exactCount}, loaded ${rows.length}. Rerun the audit.`,
        );
      }
      return {
        spec,
        status: 'present',
        count: rows.length,
        rows,
        deleteKey,
      };
    }
  }

  throw new Error(`Table pagination exceeded the safety limit for public.${spec.name}.`);
}

function resolveDeleteKey(spec, rows) {
  if (spec.deleteKey) {
    return spec.deleteKey;
  }
  const candidates = spec.deleteKeyCandidates ?? [];
  const resolved = candidates.find((candidate) => rows.length === 0
    || rows.every((row) => row[candidate] !== null && row[candidate] !== undefined));
  if (!resolved && rows.length > 0) {
    throw new Error(
      `Cannot identify a safe deletion key for public.${spec.name}; expected one of ${candidates.join(', ')}.`,
    );
  }
  return resolved ?? candidates[0] ?? null;
}

async function auditTables(client, specs) {
  const audits = new Map();
  for (const spec of specs) {
    const result = await readTable(client, spec);
    audits.set(spec.name, result);
  }
  return audits;
}

function reportTableAudit(audit) {
  return {
    status: audit.status,
    count: audit.count,
    records: audit.rows.map((row) => pickFields(row, audit.spec.reportFields)),
  };
}

function pickFields(row, fields = []) {
  const picked = {};
  for (const field of fields) {
    if (Object.hasOwn(row, field)) {
      picked[field] = row[field];
    }
  }
  return picked;
}

async function listBuckets(client) {
  const bucketsById = new Map();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * STORAGE_PAGE_SIZE;
    const { data, error } = await client.storage.listBuckets({
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: 'id', order: 'asc' },
    });
    if (error) {
      throw operationError('Storage listBuckets', `offset ${offset}`, error);
    }

    const buckets = Array.isArray(data) ? data : (data?.buckets ?? []);
    for (const bucket of buckets) {
      if (bucket?.id) {
        bucketsById.set(bucket.id, bucket);
      }
    }
    if (buckets.length < STORAGE_PAGE_SIZE) {
      return [...bucketsById.values()].sort((left, right) => left.id.localeCompare(right.id));
    }
  }
  throw new Error('Storage bucket pagination exceeded the safety limit.');
}

async function listBucketObjects(client, bucketId) {
  const objects = [];
  const pendingPrefixes = [''];
  const visitedPrefixes = new Set();

  while (pendingPrefixes.length > 0) {
    const prefix = pendingPrefixes.shift();
    if (visitedPrefixes.has(prefix)) {
      continue;
    }
    visitedPrefixes.add(prefix);

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const offset = page * STORAGE_PAGE_SIZE;
      const { data, error } = await client.storage.from(bucketId).list(prefix, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) {
        throw operationError('Storage object listing', `${bucketId}/${prefix}`, error);
      }

      const entries = data ?? [];
      for (const entry of entries) {
        const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id === null || entry.id === undefined) {
          pendingPrefixes.push(objectPath);
        } else {
          objects.push({ bucket: bucketId, path: objectPath });
          if (objects.length > MAX_STORAGE_OBJECTS) {
            throw new Error(
              `Storage audit exceeded ${MAX_STORAGE_OBJECTS} objects in bucket ${bucketId}; use a reviewed large-bucket process.`,
            );
          }
        }
      }

      if (entries.length < STORAGE_PAGE_SIZE) {
        break;
      }
    }
  }

  return objects.sort(compareByJson);
}

async function auditStorage(client) {
  const buckets = await listBuckets(client);
  const objectsByBucket = new Map();
  for (const bucket of buckets) {
    objectsByBucket.set(bucket.id, await listBucketObjects(client, bucket.id));
  }
  return { buckets, objectsByBucket };
}

function buildStoragePlan(configuration, authUsers, tableAudits, storageAudit) {
  const exactTargets = new Map();
  const invalidReferences = [];
  const authAndAppIds = new Set(authUsers.map((user) => user.id));
  const appUsers = rowsFor(tableAudits, 'users');
  for (const user of appUsers) {
    if (user.id) {
      authAndAppIds.add(String(user.id));
    }
    if (user.supabase_user_id) {
      authAndAppIds.add(String(user.supabase_user_id));
    }
    if (user.profile_image_path) {
      addStorageReference(
        exactTargets,
        invalidReferences,
        configuration,
        configuration.profileBucket,
        user.profile_image_path,
        `public.users:${user.id}:profile_image_path`,
      );
    }
  }

  for (const record of rowsFor(tableAudits, 'file_records')) {
    addStorageReference(
      exactTargets,
      invalidReferences,
      configuration,
      record.storage_bucket,
      record.storage_path,
      `public.file_records:${record.id}`,
    );
  }

  const legacyMediaColumns = [
    ['projects', 'thumbnail'],
    ['deliverables', 'thumbnail'],
    ['portfolio_items', 'image'],
  ];
  for (const [table, column] of legacyMediaColumns) {
    for (const record of rowsFor(tableAudits, table)) {
      if (!record[column]) {
        continue;
      }
      const parsed = parseSameProjectStorageUrl(configuration, record[column]);
      if (parsed) {
        addExactTarget(exactTargets, parsed.bucket, parsed.path, `public.${table}:${record.id}:${column}`);
      }
    }
  }

  const orderIds = new Set(rowsFor(tableAudits, 'orders')
    .map((order) => order.id)
    .filter(Boolean)
    .map(String));
  const listedObjects = [...storageAudit.objectsByBucket.values()].flat();
  const targets = [];
  const preserved = [];

  for (const object of listedObjects) {
    const key = storageKey(object.bucket, object.path);
    const reasons = new Set(exactTargets.get(key) ?? []);
    for (const identityId of authAndAppIds) {
      if (object.path.startsWith(`${identityId}/avatars/`)) {
        reasons.add(`avatar prefix for deleted identity ${identityId}`);
      }
    }
    for (const orderId of orderIds) {
      if (object.path.startsWith(`orders/${orderId}/`)) {
        reasons.add(`order prefix for deleted order ${orderId}`);
      }
    }

    if (reasons.size > 0) {
      targets.push({ ...object, reasons: [...reasons].sort() });
    } else {
      preserved.push(object);
    }
  }

  const listedKeys = new Set(listedObjects.map((object) => storageKey(object.bucket, object.path)));
  const alreadyAbsent = [...exactTargets.entries()]
    .filter(([key]) => !listedKeys.has(key))
    .map(([key, reasons]) => {
      const separator = key.indexOf('\u0000');
      return {
        bucket: key.slice(0, separator),
        path: key.slice(separator + 1),
        reasons: [...reasons].sort(),
      };
    })
    .sort(compareByJson);

  return {
    targets: targets.sort(compareByJson),
    alreadyAbsent,
    preserved: preserved.sort(compareByJson),
    invalidReferences,
    bucketSummary: storageAudit.buckets.map((bucket) => {
      const objects = storageAudit.objectsByBucket.get(bucket.id) ?? [];
      return {
        id: bucket.id,
        public: bucket.public ?? null,
        objectCount: objects.length,
        targetObjectCount: targets.filter((object) => object.bucket === bucket.id).length,
        preservedObjectCount: preserved.filter((object) => object.bucket === bucket.id).length,
        definition: 'PRESERVED',
      };
    }),
  };
}

function rowsFor(audits, tableName) {
  return audits.get(tableName)?.rows ?? [];
}

function addStorageReference(targets, invalidReferences, configuration, bucket, path, reason) {
  if (!path || !String(path).trim()) {
    return;
  }

  const parsedUrl = parseSameProjectStorageUrl(configuration, path);
  if (parsedUrl) {
    addExactTarget(targets, parsedUrl.bucket, parsedUrl.path, reason);
    return;
  }

  const normalizedBucket = String(bucket ?? '').trim();
  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedBucket || !normalizedPath) {
    invalidReferences.push({
      source: reason,
      issue: 'Missing/invalid Storage bucket or object path; no object will be deleted for this reference.',
    });
    return;
  }
  addExactTarget(targets, normalizedBucket, normalizedPath, reason);
}

function addExactTarget(targets, bucket, path, reason) {
  const key = storageKey(bucket, path);
  const reasons = targets.get(key) ?? new Set();
  reasons.add(reason);
  targets.set(key, reasons);
}

function storageKey(bucket, path) {
  return `${bucket}\u0000${path}`;
}

function normalizeStoragePath(value) {
  const path = String(value).trim().replace(/^\/+/, '');
  if (!path || path.includes('\\') || path.split('/').some((part) => part === '..')) {
    return null;
  }
  return path;
}

function parseSameProjectStorageUrl(configuration, value) {
  let parsed;
  try {
    parsed = new URL(String(value));
  } catch {
    return null;
  }
  if (parsed.hostname.toLowerCase() !== `${configuration.expectedProjectRef}.supabase.co`) {
    return null;
  }

  const marker = '/storage/v1/object/';
  if (!parsed.pathname.startsWith(marker)) {
    return null;
  }
  const segments = parsed.pathname.slice(marker.length).split('/').filter(Boolean);
  if (['public', 'sign', 'authenticated'].includes(segments[0])) {
    segments.shift();
  }
  if (segments.length < 2) {
    return null;
  }
  const bucket = decodeURIComponent(segments.shift());
  const path = normalizeStoragePath(segments.map(decodeURIComponent).join('/'));
  return bucket && path ? { bucket, path } : null;
}

function buildBlockers(preservedTableAudits, storagePlan) {
  const blockers = [];
  for (const audit of preservedTableAudits.values()) {
    if (audit.spec.blocksAuthDeletionWhenNonEmpty && audit.count > 0) {
      blockers.push(
        `public.${audit.spec.name} has ${audit.count} preserved row(s) tied to auth.users with ON DELETE CASCADE; Auth deletion would violate the preservation requirement.`,
      );
    }
  }
  if (storagePlan.invalidReferences.length > 0) {
    blockers.push(
      `${storagePlan.invalidReferences.length} owned Storage reference(s) are invalid or incomplete and cannot be safely deleted.`,
    );
  }
  return blockers;
}

function buildWarnings(deleteTableAudits, storagePlan) {
  const warnings = [
    'Backup state cannot be queried with a service-role key. Setting the exact execution confirmation after reviewing this report is treated as the explicit reviewed backup waiver when no backup was independently verified.',
    'PostgREST cannot wrap deletes across multiple public tables in one global transaction. Each dependency-ordered table request is transactional, fail-fast, and rerunnable.',
    'Storage objects not positively matched by a database reference or reviewed user/order prefix are preserved.',
  ];
  const absentTables = [...deleteTableAudits.values()]
    .filter((audit) => audit.status === 'absent')
    .map((audit) => `public.${audit.spec.name}`);
  if (absentTables.length > 0) {
    warnings.push(`Tables absent from the live public schema: ${absentTables.join(', ')}.`);
  }
  if (storagePlan.alreadyAbsent.length > 0) {
    warnings.push(
      `${storagePlan.alreadyAbsent.length} database-referenced Storage object(s) are already absent; reruns treat those as idempotently complete.`,
    );
  }
  return warnings;
}

function buildPlanHash(authUsers, deleteTableAudits, storagePlan) {
  const tableTargets = [...deleteTableAudits.values()]
    .map((audit) => ({
      table: audit.spec.name,
      keys: audit.rows
        .map((row) => row[audit.deleteKey])
        .filter((value) => value !== null && value !== undefined)
        .map(String)
        .sort(),
    }))
    .sort((left, right) => left.table.localeCompare(right.table));
  const payload = {
    authUserIds: authUsers.map((user) => user.id).sort(),
    tableTargets,
    storageTargets: storagePlan.targets
      .map((object) => `${object.bucket}/${object.path}`)
      .sort(),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildAuditReport(configuration, authUsers, deleteTableAudits, preservedTableAudits, storagePlan) {
  const deleteTables = {};
  for (const [name, audit] of deleteTableAudits) {
    deleteTables[name] = reportTableAudit(audit);
  }
  const preservedTables = {};
  for (const [name, audit] of preservedTableAudits) {
    preservedTables[name] = {
      ...reportTableAudit(audit),
      reason: audit.spec.reason,
    };
  }
  const blockers = buildBlockers(preservedTableAudits, storagePlan);
  return {
    status: configuration.mode === 'execute' ? 'EXECUTION_PREFLIGHT_COMPLETE' : 'DRY_RUN_COMPLETE',
    mode: configuration.mode,
    generatedAt: new Date().toISOString(),
    project: {
      verified: true,
      ref: configuration.expectedProjectRef,
      host: `${configuration.expectedProjectRef}.supabase.co`,
    },
    backup: {
      status: 'UNVERIFIED_BY_SCRIPT',
      executePolicy: 'Verify a backup or explicitly accept the reviewed waiver before setting DELETE_USERS_CONFIRMATION.',
    },
    auth: {
      deleteCount: authUsers.length,
      users: authUsers,
    },
    application: {
      deletionOrder: DELETE_TABLE_SPECS.map((spec) => `public.${spec.name}`),
      deleteTables,
      preservedTables,
      preservedStructures: [
        'database schemas, tables, columns, constraints, indexes, RLS policies, functions, triggers, and migration history',
        'Supabase system schemas',
        'Supabase Storage bucket definitions',
        'service catalog and service packages',
        'contact messages without an explicit user foreign key',
        'general configuration not represented by per-user app_settings rows',
      ],
    },
    storage: {
      profileBucketConfiguration: configuration.profileBucket,
      orderFilesBucketConfiguration: configuration.orderFilesBucket,
      buckets: storagePlan.bucketSummary,
      deleteObjectCount: storagePlan.targets.length,
      deleteObjects: storagePlan.targets,
      alreadyAbsentReferences: storagePlan.alreadyAbsent,
      invalidReferences: storagePlan.invalidReferences,
      preservedObjectCount: storagePlan.preserved.length,
      preservedObjects: storagePlan.preserved,
    },
    transactionScope: {
      storage: 'Storage API requests, before database rows',
      publicData: 'one PostgREST transaction per dependency-ordered table request',
      auth: 'one official Admin API request per user, last',
      globalTransactionAvailable: false,
    },
    planHash: buildPlanHash(authUsers, deleteTableAudits, storagePlan),
    blockers,
    warnings: buildWarnings(deleteTableAudits, storagePlan),
    executionAuthorized: configuration.mode === 'execute',
    mutationPerformed: false,
  };
}

async function performReadOnlyAudit(client, configuration) {
  const authUsers = await listAuthUsers(client);
  const deleteTableAudits = await auditTables(client, DELETE_TABLE_SPECS);
  const preservedTableAudits = await auditTables(client, PRESERVED_TABLE_SPECS);
  const storageAudit = await auditStorage(client);
  const storagePlan = buildStoragePlan(
    configuration,
    authUsers,
    deleteTableAudits,
    storageAudit,
  );
  const report = buildAuditReport(
    configuration,
    authUsers,
    deleteTableAudits,
    preservedTableAudits,
    storagePlan,
  );
  return {
    authUsers,
    deleteTableAudits,
    preservedTableAudits,
    storageAudit,
    storagePlan,
    report,
  };
}

async function deleteStorageObjects(client, storagePlan, progress) {
  const byBucket = new Map();
  for (const target of storagePlan.targets) {
    const paths = byBucket.get(target.bucket) ?? [];
    paths.push(target.path);
    byBucket.set(target.bucket, paths);
  }

  for (const [bucket, paths] of byBucket) {
    for (const batch of batches([...new Set(paths)].sort(), DELETE_BATCH_SIZE)) {
      const { error } = await client.storage.from(bucket).remove(batch);
      if (error) {
        throw operationError('Storage object deletion', bucket, error);
      }
      progress.storageDeleted.push(...batch.map((path) => ({ bucket, path })));
    }
  }
}

async function deleteApplicationRows(client, deleteTableAudits, progress) {
  for (const spec of DELETE_TABLE_SPECS) {
    const audit = deleteTableAudits.get(spec.name);
    if (!audit || audit.status === 'absent' || audit.rows.length === 0) {
      progress.tablesCompleted.push({ table: `public.${spec.name}`, requestedRows: 0 });
      continue;
    }
    if (!audit.deleteKey) {
      throw new Error(`No safe deletion key was resolved for public.${spec.name}.`);
    }
    const keys = [...new Set(audit.rows.map((row) => row[audit.deleteKey]))];
    if (keys.some((key) => key === null || key === undefined)) {
      throw new Error(`public.${spec.name} contains a row without ${audit.deleteKey}; deletion refused.`);
    }

    for (const batch of batches(keys, DELETE_BATCH_SIZE)) {
      const { error } = await client
        .from(spec.name)
        .delete({ count: 'exact' })
        .in(audit.deleteKey, batch);
      if (error) {
        throw operationError('application row deletion', `public.${spec.name}`, error);
      }
    }
    progress.tablesCompleted.push({
      table: `public.${spec.name}`,
      requestedRows: audit.rows.length,
    });
  }
}

async function deleteAuthUsers(client, authUsers, progress) {
  for (const user of authUsers) {
    const { error } = await client.auth.admin.deleteUser(user.id, false);
    if (error) {
      throw operationError('Auth Admin deleteUser', user.id, error);
    }
    progress.authUsersDeleted.push({ id: user.id, email: user.email });
  }
}

async function verifyExecution(client, initialAudit, configuration) {
  const remainingAuthUsers = await listAuthUsers(client);
  const remainingDeleteTables = await auditTables(client, DELETE_TABLE_SPECS);
  const remainingPreservedTables = await auditTables(client, PRESERVED_TABLE_SPECS);
  const remainingStorage = await auditStorage(client);
  const remainingStoragePlan = buildStoragePlan(
    configuration,
    initialAudit.authUsers,
    initialAudit.deleteTableAudits,
    remainingStorage,
  );

  const failures = [];
  if (remainingAuthUsers.length > 0) {
    failures.push(`${remainingAuthUsers.length} Auth user(s) remain.`);
  }
  for (const audit of remainingDeleteTables.values()) {
    if (audit.count > 0) {
      failures.push(`public.${audit.spec.name} still has ${audit.count} target row(s).`);
    }
  }
  if (remainingStoragePlan.targets.length > 0) {
    failures.push(`${remainingStoragePlan.targets.length} selected Storage object(s) remain.`);
  }

  const preservedTableChecks = {};
  for (const [name, before] of initialAudit.preservedTableAudits) {
    const after = remainingPreservedTables.get(name);
    const passed = before.status === after?.status && before.count === after?.count;
    preservedTableChecks[name] = {
      beforeStatus: before.status,
      afterStatus: after?.status ?? 'unknown',
      beforeCount: before.count,
      afterCount: after?.count ?? null,
      passed,
    };
    if (!passed) {
      failures.push(`Preserved table public.${name} changed unexpectedly.`);
    }
  }

  const beforeBucketIds = initialAudit.storageAudit.buckets.map((bucket) => bucket.id).sort();
  const afterBucketIds = remainingStorage.buckets.map((bucket) => bucket.id).sort();
  const bucketDefinitionsPreserved = JSON.stringify(beforeBucketIds) === JSON.stringify(afterBucketIds);
  if (!bucketDefinitionsPreserved) {
    failures.push('Storage bucket definitions changed unexpectedly.');
  }

  return {
    passed: failures.length === 0,
    failures,
    authUserCount: remainingAuthUsers.length,
    targetTableCounts: Object.fromEntries(
      [...remainingDeleteTables].map(([name, audit]) => [name, audit.count]),
    ),
    selectedStorageObjectCount: remainingStoragePlan.targets.length,
    preservedTableChecks,
    bucketDefinitionsPreserved,
    hibernateValidation: 'NOT_RUN_BY_SCRIPT; run Maven tests/package and start Spring Boot after approved execution.',
  };
}

function* batches(values, size) {
  for (let index = 0; index < values.length; index += size) {
    yield values.slice(index, index + size);
  }
}

function compareByJson(left, right) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

async function main() {
  requireNode22();
  const mode = parseMode(process.argv.slice(2));
  if (mode === 'help') {
    console.log(usage());
    return;
  }

  const configuration = readConfiguration(mode);
  const client = createAdminClient(configuration);
  const audit = await performReadOnlyAudit(client, configuration);
  console.log(JSON.stringify(audit.report, null, 2));

  if (mode === 'dry-run') {
    return;
  }
  if (audit.report.blockers.length > 0) {
    throw new Error(
      `Execution refused because the dry-run found ${audit.report.blockers.length} blocker(s).`,
    );
  }

  const progress = {
    status: 'IN_PROGRESS',
    planHash: audit.report.planHash,
    storageDeleted: [],
    tablesCompleted: [],
    authUsersDeleted: [],
  };

  try {
    await deleteStorageObjects(client, audit.storagePlan, progress);
    await deleteApplicationRows(client, audit.deleteTableAudits, progress);
    await deleteAuthUsers(client, audit.authUsers, progress);
    const verification = await verifyExecution(client, audit, configuration);
    progress.status = verification.passed ? 'COMPLETE' : 'INCOMPLETE';
    console.log(JSON.stringify({
      status: progress.status,
      mutationPerformed: true,
      projectRef: configuration.expectedProjectRef,
      progress,
      verification,
      safeRerunCommand: 'node scripts/delete-existing-users.mjs --execute',
    }, null, 2));
    if (!verification.passed) {
      process.exitCode = 1;
    }
  } catch (error) {
    progress.status = 'INCOMPLETE';
    console.error(JSON.stringify({
      status: 'INCOMPLETE',
      mutationPerformed: progress.storageDeleted.length > 0
        || progress.tablesCompleted.some((table) => table.requestedRows > 0)
        || progress.authUsersDeleted.length > 0,
      projectRef: configuration.expectedProjectRef,
      error: sanitizedError(error, [configuration.serviceRoleKey]),
      progress,
      safeRerunCommand: 'node scripts/delete-existing-users.mjs --execute',
    }, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const secrets = [process.env.SUPABASE_SERVICE_ROLE_KEY];
  console.error(JSON.stringify({
    status: 'REFUSED_OR_FAILED_BEFORE_MUTATION',
    mutationPerformed: false,
    error: sanitizedError(error, secrets),
  }, null, 2));
  process.exitCode = 1;
});
