/**
 * Utility to exhaustively fetch all records from a Supabase query by paginating
 * in batches (default 1000 items, matching Supabase's default max_rows limit).
 * 
 * Ensures no records are truncated even as database tables scale to tens of thousands of rows.
 */
export async function fetchAllPaginatedRows<T>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFactory(from, to);

    if (error) {
      throw new Error(error.message || "Failed to fetch paginated data from Supabase.");
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);

    // If the returned batch is smaller than pageSize, we have reached the end
    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}
