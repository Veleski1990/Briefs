import { NextRequest, NextResponse } from 'next/server'
import { discoverBoardStructure } from '@/lib/monday'

// GET /api/monday-setup          → lists all your Monday.com boards
// GET /api/monday-setup?board=ID → shows groups + columns for that board
export async function GET(request: NextRequest) {
  if (!process.env.MONDAY_API_KEY) {
    return NextResponse.json({ error: 'MONDAY_API_KEY not set in env vars' }, { status: 500 })
  }

  const boardId = request.nextUrl.searchParams.get('board') ?? undefined

  try {
    const data = await discoverBoardStructure(boardId)

    if (boardId) {
      const board = data.boards?.[0]
      if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

      return NextResponse.json({
        board: { id: board.id, name: board.name },
        groups: board.groups,
        columns: board.columns,
        hint: {
          'MONDAY_STATUS_COL_ID': 'find the "Status" column id above',
          'MONDAY_DATE_COL_ID':   'find the "Date" or "Due date" column id above',
          'MONDAY_CLIENT_COL_ID': 'find a client/text column id above (optional)',
          'MONDAY_TODO_GROUP_ID': 'find the "To-Do" or active group id above',
        },
      })
    }

    return NextResponse.json({
      boards: data.boards,
      hint: 'Pick a board ID and call /api/monday-setup?board=YOUR_BOARD_ID to see its columns',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
