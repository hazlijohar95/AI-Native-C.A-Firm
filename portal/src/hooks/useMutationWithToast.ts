import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseMutationWithToastOptions<TResult> {
  /** Message to show on success */
  successMessage?: string;
  /** Message to show on error (fallback if error has no message) */
  errorMessage?: string;
  /** Callback after successful mutation */
  onSuccess?: (result: TResult) => void;
  /** Callback after failed mutation */
  onError?: (error: Error) => void;
}

/**
 * Hook that wraps a mutation with loading state and toast notifications.
 * Eliminates repetitive try/catch/toast patterns across the codebase.
 *
 * @example
 * ```tsx
 * const createDocument = useMutation(api.documents.create);
 * const { execute, isLoading } = useMutationWithToast(createDocument, {
 *   successMessage: "Document created!",
 *   onSuccess: () => setDialogOpen(false),
 * });
 *
 * // In form submit handler:
 * await execute({ name: "My Doc", category: "tax" });
 * ```
 */
export function useMutationWithToast<TArgs, TResult>(
  mutation: (args: TArgs) => Promise<TResult>,
  options: UseMutationWithToastOptions<TResult> = {}
) {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (args: TArgs): Promise<TResult | undefined> => {
      setIsLoading(true);
      try {
        const result = await mutation(args);
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : options.errorMessage ?? "An error occurred";
        toast.error(errorMessage);
        options.onError?.(error instanceof Error ? error : new Error(errorMessage));
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [mutation, options]
  );

  return { execute, isLoading };
}
