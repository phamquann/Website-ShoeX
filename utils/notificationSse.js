const clientsByUser = new Map();

const HEARTBEAT_MS = 25000;

const writeEvent = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const unregisterClient = (userId, res, timer) => {
  if (timer) clearInterval(timer);

  const key = String(userId);
  const clients = clientsByUser.get(key);
  if (!clients) return;

  clients.delete(res);
  if (clients.size === 0) {
    clientsByUser.delete(key);
  }
};

const registerClient = (userId, res) => {
  const key = String(userId);
  if (!clientsByUser.has(key)) {
    clientsByUser.set(key, new Set());
  }

  const clients = clientsByUser.get(key);
  clients.add(res);

  const heartbeat = setInterval(() => {
    try {
      writeEvent(res, 'heartbeat', { ts: Date.now() });
    } catch (error) {
      unregisterClient(key, res, heartbeat);
    }
  }, HEARTBEAT_MS);

  const cleanup = () => unregisterClient(key, res, heartbeat);
  res.on('close', cleanup);
  res.on('error', cleanup);

  return cleanup;
};

const broadcastNotifications = (notifications) => {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return;
  }

  const grouped = new Map();

  for (const notification of notifications) {
    const plain = notification?.toObject ? notification.toObject() : notification;
    const userId = plain?.user?.toString?.() || plain?.user;
    if (!userId) continue;

    if (!grouped.has(userId)) {
      grouped.set(userId, []);
    }

    grouped.get(userId).push(plain);
  }

  for (const [userId, payload] of grouped.entries()) {
    const clients = clientsByUser.get(String(userId));
    if (!clients || clients.size === 0) continue;

    for (const res of clients) {
      try {
        writeEvent(res, 'notification', {
          count: payload.length,
          items: payload
        });
      } catch (error) {
        unregisterClient(userId, res);
      }
    }
  }
};

module.exports = {
  registerClient,
  broadcastNotifications
};
