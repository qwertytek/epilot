const getErrorMessage = (
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};

export { getErrorMessage };
