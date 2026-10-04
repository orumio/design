type Section = "a" | "b"
export function Picker({ go }: { go: () => void }) {
  const map: Record<Section, number> = { a: 1, b: 2 }
  const pick = useState<Section | null>(null)
  return (
    <Panel
      title="Addresses"
      action={
        <>
          <Action onPress={() => go()} label="Connect" />
        </>
      }
    >
      <li onClick={go}>{map.a}</li>
      <span className="size-7 rounded-circle bg-surface" />
    </Panel>
  )
}
