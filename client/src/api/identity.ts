const userIdStorageKey = 'btc-game.user-id';

const getAnonymousUserId = (): string => {
  const existingUserId = localStorage.getItem(userIdStorageKey);

  if (existingUserId) {
    return existingUserId;
  }

  const userId = crypto.randomUUID();
  localStorage.setItem(userIdStorageKey, userId);
  return userId;
};

export { getAnonymousUserId };
