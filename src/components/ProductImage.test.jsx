import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProductImage from './ProductImage'

describe('ProductImage — real photo vs placeholder fallback', () => {
  it('renders the real photo when image_url is set', () => {
    render(
      <ProductImage
        product={{ name: 'Red Bull', image: 'https://cdn.example/p/1.jpg' }}
        categoryIcon="⚡"
      />,
    )
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://cdn.example/p/1.jpg')
    expect(img).toHaveAttribute('loading', 'lazy') // lazy-loaded for long lists
  })

  it('falls back to the category-icon placeholder when there is no image', () => {
    render(<ProductImage product={{ name: 'Sut', image: null }} categoryIcon="🥛" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('🥛')).toBeInTheDocument()
  })

  it('falls back to the placeholder if the image fails to load (broken URL)', () => {
    render(
      <ProductImage
        product={{ name: 'Choy', image: 'https://cdn.example/missing.jpg' }}
        categoryIcon="🍵"
      />,
    )
    fireEvent.error(screen.getByRole('img')) // simulate a load error
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('🍵')).toBeInTheDocument()
  })
})
