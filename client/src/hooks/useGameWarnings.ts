import { useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '../api/http';
import { getErrorMessage } from '../shared/utils/errors';
import type { GameFeedbackProps } from '../features/game/model/game.types';

const WARNING_NOTIFICATION_TTL_MS = 5000;
const WARNING_NOTIFICATION_EXIT_MS = 260;
const WARNING_NOTIFICATION_STAGGER_MS = 600;

export type GameWarningNotification = GameFeedbackProps & {
  expiresAt: number | null;
  id: string;
  isExiting: boolean;
  isPersistent: boolean;
  key: string;
};

type GameWarningMessage = GameFeedbackProps & {
  isPersistent?: boolean;
};

type UseGameWarningsOptions = {
  error: unknown;
  feedback: GameFeedbackProps | null;
};

const getWarningNotificationKey = ({
  message,
  tone = 'neutral',
}: GameFeedbackProps) => `${tone}:${message}`;

const isExpiredPriceSnapshotError = (error: unknown) =>
  error instanceof ApiError &&
  error.error.error.code === 'PRICE_SNAPSHOT_EXPIRED';

const getDismissalTime = (now: number, index: number, total: number) =>
  now +
  WARNING_NOTIFICATION_TTL_MS +
  (total - index - 1) * WARNING_NOTIFICATION_STAGGER_MS;

const isScheduledNotification = (
  notification: GameWarningNotification,
): notification is GameWarningNotification & { expiresAt: number } =>
  notification.expiresAt !== null && !notification.isExiting;

const useActiveGameWarnings = ({ error, feedback }: UseGameWarningsOptions) =>
  useMemo(() => {
    const warnings: GameWarningMessage[] = [];

    if (error) {
      warnings.push({
        isPersistent: isExpiredPriceSnapshotError(error),
        message: getErrorMessage(
          error,
          'Unable to update the game. Please try again.',
        ),
        tone: 'error',
      });
    }

    if (feedback) {
      warnings.push(feedback);
    }

    return warnings;
  }, [error, feedback]);

export const useGameWarnings = (options: UseGameWarningsOptions) => {
  const [warnings, setWarnings] = useState<GameWarningNotification[]>([]);
  const nextWarningId = useRef(0);
  const activeWarnings = useActiveGameWarnings(options);
  const activeWarningKey = activeWarnings
    .map(getWarningNotificationKey)
    .join('\n');

  useEffect(() => {
    const now = Date.now();

    if (activeWarnings.length === 0) {
      setWarnings((notifications) =>
        notifications.map((notification, index) =>
          notification.expiresAt === null && !notification.isPersistent
            ? {
                ...notification,
                expiresAt: getDismissalTime(now, index, notifications.length),
              }
            : notification,
        ),
      );
      return;
    }

    setWarnings((notifications) => {
      let nextNotifications = notifications;

      activeWarnings.forEach((warning) => {
        const key = getWarningNotificationKey(warning);
        const notification = {
          ...warning,
          expiresAt: null,
          id: `${now}-${nextWarningId.current}`,
          isExiting: false,
          isPersistent: warning.isPersistent ?? false,
          key,
        };

        nextWarningId.current += 1;
        const staleNotifications = nextNotifications.filter(
          (item) => item.key !== key,
        );
        nextNotifications = [
          notification,
          ...staleNotifications.map((item, index) =>
            item.expiresAt === null && !item.isPersistent
              ? {
                  ...item,
                  expiresAt: getDismissalTime(
                    now,
                    index + 1,
                    staleNotifications.length + 1,
                  ),
                }
              : item,
          ),
        ].slice(0, 2);
      });

      return nextNotifications;
    });
  }, [activeWarningKey, activeWarnings]);

  useEffect(() => {
    const expiringNotifications = warnings.filter(isScheduledNotification);

    if (expiringNotifications.length === 0) {
      return;
    }

    const nextExpiry = Math.min(
      ...expiringNotifications.map((notification) => notification.expiresAt),
    );
    const timeoutId = window.setTimeout(
      () => {
        const now = Date.now();

        setWarnings((notifications) => {
          const expiredNotification = [...notifications]
            .reverse()
            .find(
              (notification) =>
                notification.expiresAt !== null &&
                notification.expiresAt <= now &&
                !notification.isExiting,
            );

          if (!expiredNotification) {
            return notifications;
          }

          return notifications.map((notification) =>
            notification.id === expiredNotification.id
              ? {
                  ...notification,
                  isExiting: true,
                }
              : notification.expiresAt !== null &&
                  notification.expiresAt <= now + WARNING_NOTIFICATION_EXIT_MS
                ? {
                    ...notification,
                    expiresAt:
                      now +
                      WARNING_NOTIFICATION_EXIT_MS +
                      WARNING_NOTIFICATION_STAGGER_MS,
                  }
                : notification,
          );
        });
      },
      Math.max(0, nextExpiry - Date.now()),
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [warnings]);

  useEffect(() => {
    const exitingNotifications = warnings.filter(
      (notification) => notification.isExiting,
    );

    if (exitingNotifications.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setWarnings((notifications) => {
        const exitingNotification = notifications.find(
          (notification) => notification.isExiting,
        );

        if (!exitingNotification) {
          return notifications;
        }

        return notifications.filter(
          (notification) => notification.id !== exitingNotification.id,
        );
      });
    }, WARNING_NOTIFICATION_EXIT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [warnings]);

  useEffect(() => {
    setWarnings((notifications) =>
      notifications.map((notification) => {
        if (notification.isExiting) {
          const isActive = activeWarnings.some(
            (warning) =>
              getWarningNotificationKey(warning) === notification.key,
          );

          if (isActive) {
            return {
              ...notification,
              expiresAt: null,
              isExiting: false,
            };
          }
        }

        return notification;
      }),
    );
  }, [activeWarningKey, activeWarnings]);

  const dismissPersistentWarnings = () => {
    setWarnings((notifications) =>
      notifications.map((notification) =>
        notification.isPersistent
          ? {
              ...notification,
              expiresAt: null,
              isExiting: true,
              isPersistent: false,
            }
          : notification,
      ),
    );
  };

  return {
    dismissPersistentWarnings,
    warnings,
  };
};
