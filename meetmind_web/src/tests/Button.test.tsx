import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../components/ui/Button'

describe('Button Component', () => {
  it('renders button text correctly', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click Me')
  })

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click Me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isLoading is true', () => {
    render(<Button isLoading>Click Me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Processing...')
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Click Me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
