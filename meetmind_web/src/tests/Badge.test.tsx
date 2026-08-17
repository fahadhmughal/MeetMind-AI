import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from '../components/ui/Badge'

describe('Badge Component', () => {
  it('renders completed status badge', () => {
    render(<Badge status="completed" />)
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('renders processing status badge', () => {
    render(<Badge status="processing" />)
    expect(screen.getByText('processing')).toBeInTheDocument()
  })
})
