export function generateRoomId(): string {
    // Generate 4 random bytes to match Go's 8-hex-char logic
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)

    // Convert to hex string
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}
