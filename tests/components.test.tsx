import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, ToastRegion } from '../src/components/ui'
import { TemplatePicker } from '../src/components/pickers'
import { TEMPLATES } from '../src/data/templates'
import { useToasts } from '../src/state/toast'

describe('UI kit (VERIFY A11)', () => {
  it('renders and clicks primary buttons', async () => {
    const user = userEvent.setup()
    let clicked = 0
    render(<Button onClick={() => clicked++}>Start the Booth</Button>)
    await user.click(screen.getByRole('button', { name: 'Start the Booth' }))
    expect(clicked).toBe(1)
  })

  it('announces toasts politely', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button onClick={() => useToasts.getState().push('Saved to your Gallery.')}>fire</button>
        <ToastRegion />
      </>
    )
    await user.click(screen.getByRole('button', { name: 'fire' }))
    expect(screen.getByText('Saved to your Gallery.')).toBeTruthy()
  })

  it('renders every template as an option', () => {
    render(<TemplatePicker selectedId="classic-4" onSelect={() => {}} images={{}} />)
    for (const t of TEMPLATES) {
      const escaped = t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      expect(screen.getByRole('radio', { name: new RegExp(escaped, 'i') })).toBeTruthy()
    }
  })
})
