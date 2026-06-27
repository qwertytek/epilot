import { useEffect, useMemo, useRef, useState } from 'react';
import type { GuessDirection } from '@epilot/api-contract';

import { useResolveCountdown } from '../../hooks/useResolveCountdown';
import {
  formatCurrencyUsd,
  formatDateTime,
} from '../../shared/utils/formatters';
import { getErrorMessage } from '../../shared/utils/errors';
import { ApiError } from '../../api/http';
import { getAnonymousUserId } from '../../api/identity';
import { GameFeedback } from './components/GameFeedback';
import { GameHeader } from './components/GameHeader';
import { GuessControls } from './components/GuessControls';
import { PendingGuess } from './components/PendingGuess';
import { PriceDisplay } from './components/PriceDisplay';
import { DevWarnings } from './dev-warnings/DevWarnings';
import {
  useCreateGuessMutation,
  useGameStateQuery,
  usePriceStateQuery,
} from './game.queries';
import { getFeedbackMessage } from './game.feedback';
import type { GameFeedbackProps } from './game.types';

import './game.css';

const FEEDBACK_NOTIFICATION_TTL_MS = 5000;
const FEEDBACK_NOTIFICATION_EXIT_MS = 260;
const FEEDBACK_NOTIFICATION_STAGGER_MS = 600;

type FeedbackNotification = GameFeedbackProps & {
  expiresAt: number | null;
  id: string;
  isExiting: boolean;
  isPersistent: boolean;
  key: string;
};

type FeedbackMessage = GameFeedbackProps & {
  isPersistent?: boolean;
};

const getFeedbackNotificationKey = ({
  message,
  tone = 'neutral',
}: GameFeedbackProps) => `${tone}:${message}`;

const isExpiredPriceSnapshotError = (error: unknown) =>
  error instanceof ApiError &&
  error.error.error.code === 'PRICE_SNAPSHOT_EXPIRED';

const getDismissalTime = (now: number, index: number, total: number) =>
  now +
  FEEDBACK_NOTIFICATION_TTL_MS +
  (total - index - 1) * FEEDBACK_NOTIFICATION_STAGGER_MS;

const isScheduledNotification = (
  notification: FeedbackNotification,
): notification is FeedbackNotification & { expiresAt: number } =>
  notification.expiresAt !== null && !notification.isExiting;

const GamePage = () => {
  const [feedbackNotifications, setFeedbackNotifications] = useState<
    FeedbackNotification[]
  >([]);
  const nextFeedbackNotificationId = useRef(0);
  const userId = getAnonymousUserId();
  const gameStateQuery = useGameStateQuery(userId);
  const priceStateQuery = usePriceStateQuery();
  const createGuessMutation = useCreateGuessMutation(userId);

  const gameState = gameStateQuery.data ?? null;
  const latestPrice = priceStateQuery.data?.latestPrice ?? null;

  const feedback = useMemo(
    () => (gameState ? getFeedbackMessage(gameState.feedback) : null),
    [gameState],
  );

  const activeGuess = gameState?.activeGuess ?? null;
  const isSubmitting = createGuessMutation.isPending;
  const isBusy =
    gameStateQuery.isLoading || priceStateQuery.isLoading || isSubmitting;
  const { resolveWaitSeconds } = useResolveCountdown(activeGuess);
  const isCheckingResults = activeGuess !== null && resolveWaitSeconds === 0;
  const error =
    gameStateQuery.error ?? priceStateQuery.error ?? createGuessMutation.error;
  const activeFeedbackMessages = useMemo(() => {
    const messages: FeedbackMessage[] = [];

    if (error) {
      messages.push({
        isPersistent: isExpiredPriceSnapshotError(error),
        message: getErrorMessage(
          error,
          'Unable to update the game. Please try again.',
        ),
        tone: 'error',
      });
    }

    if (feedback) {
      messages.push(feedback);
    }

    return messages;
  }, [error, feedback]);
  const activeFeedbackKey = activeFeedbackMessages
    .map(getFeedbackNotificationKey)
    .join('\n');
  const pendingDirection = isSubmitting
    ? createGuessMutation.variables?.direction
    : undefined;

  useEffect(() => {
    const now = Date.now();

    if (activeFeedbackMessages.length === 0) {
      setFeedbackNotifications((notifications) =>
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

    setFeedbackNotifications((notifications) => {
      let nextNotifications = notifications;

      activeFeedbackMessages.forEach((message) => {
        const key = getFeedbackNotificationKey(message);
        const notification = {
          ...message,
          expiresAt: null,
          id: `${now}-${nextFeedbackNotificationId.current}`,
          isExiting: false,
          isPersistent: message.isPersistent ?? false,
          key,
        };

        nextFeedbackNotificationId.current += 1;
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
  }, [activeFeedbackKey, activeFeedbackMessages]);

  useEffect(() => {
    const expiringNotifications = feedbackNotifications.filter(
      isScheduledNotification,
    );

    if (expiringNotifications.length === 0) {
      return;
    }

    const nextExpiry = Math.min(
      ...expiringNotifications.map((notification) => notification.expiresAt),
    );
    const timeoutId = window.setTimeout(
      () => {
        const now = Date.now();

        setFeedbackNotifications((notifications) => {
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
                  notification.expiresAt <= now + FEEDBACK_NOTIFICATION_EXIT_MS
                ? {
                    ...notification,
                    expiresAt:
                      now +
                      FEEDBACK_NOTIFICATION_EXIT_MS +
                      FEEDBACK_NOTIFICATION_STAGGER_MS,
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
  }, [feedbackNotifications]);

  useEffect(() => {
    const exitingNotifications = feedbackNotifications.filter(
      (notification) => notification.isExiting,
    );

    if (exitingNotifications.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackNotifications((notifications) => {
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
    }, FEEDBACK_NOTIFICATION_EXIT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedbackNotifications]);

  useEffect(() => {
    setFeedbackNotifications((notifications) =>
      notifications.map((notification) => {
        if (notification.isExiting) {
          const isActive = activeFeedbackMessages.some(
            (message) =>
              getFeedbackNotificationKey(message) === notification.key,
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
  }, [activeFeedbackKey, activeFeedbackMessages]);

  const handleGuess = async (direction: GuessDirection) => {
    if (
      gameState === null ||
      latestPrice === null ||
      activeGuess !== null ||
      isBusy
    ) {
      return;
    }

    setFeedbackNotifications((notifications) =>
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

    createGuessMutation.mutate({
      direction,
      priceSnapshotId: latestPrice.priceSnapshotId,
    });
  };

  return (
    <div className="app-shell flex items-center text-brand-navy">
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-10">
          <GameHeader score={gameState?.score ?? null} />

          <div
            className="game-feedback-region mt-6 grid gap-3"
            aria-live="polite"
          >
            {feedbackNotifications.map(({ id, isExiting, message, tone }) => (
              <div
                className={
                  isExiting
                    ? 'game-feedback-notification is-exiting'
                    : 'game-feedback-notification'
                }
                key={id}
              >
                <GameFeedback message={message} tone={tone} />
              </div>
            ))}
          </div>

          <div className="game-content-grid mt-9 border-t border-brand-border pt-8">
            <PriceDisplay
              price={
                latestPrice ? formatCurrencyUsd(latestPrice.priceUsd) : null
              }
              updatedAt={
                latestPrice ? formatDateTime(latestPrice.observedAt) : null
              }
            />

            {activeGuess ? (
              <div className="grid gap-4">
                <PendingGuess
                  direction={activeGuess.direction}
                  eligibleAt={formatDateTime(activeGuess.eligibleAt)}
                />
                <p className="rounded-2xl border border-brand-border bg-white px-5 py-3 text-sm font-semibold text-brand-primary">
                  {resolveWaitSeconds > 0
                    ? `Checking results in ${resolveWaitSeconds}s`
                    : 'Checking for results...'}
                </p>
              </div>
            ) : (
              <GuessControls
                disabled={gameState === null || latestPrice === null || isBusy}
                label="Which way will it move?"
                onGuess={handleGuess}
                pendingDirection={pendingDirection}
              />
            )}
          </div>

          <DevWarnings
            hasGameState={gameState !== null}
            hasLatestPrice={latestPrice !== null}
            isCheckingResults={isCheckingResults}
            isGameStateFetching={gameStateQuery.isFetching}
            isPriceFetching={priceStateQuery.isFetching}
            isPriceStale={priceStateQuery.isStale}
          />
        </div>
      </main>
    </div>
  );
};

export { GamePage };
