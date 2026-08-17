import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Popup } from '../popup/Popup'

describe('Extension Popup Component', () => {
  it('renders extension header and brand title', () => {
    render(<Popup />)
    expect(screen.getByText('MeetMind AI')).toBeInTheDocument()
    expect(screen.getByText('Web App')).toBeInTheDocument()
  })

  it('allows changing meeting title', () => {
    render(<Popup />)
    const input = screen.getByPlaceholderText('Google Meet / Teams Sync')
    fireEvent.change(input, { target: { value: 'Sprint Planning' } })
    expect(input).toHaveValue('Sprint Planning')
  })

  it('renders capture button', () => {
    render(<Popup />)
    expect(screen.getByRole('button', { name: /Start Meeting Capture/i })).toBeInTheDocument()
  })
})
