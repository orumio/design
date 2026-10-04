export function Controls({ go, cn }: { go: () => void; cn: (...c: string[]) => string }) {
  return (
    <div>
      <Button isIconOnly className="size-8 rounded-full">x</Button>
      <Disclosure.Trigger
        aria-label="Open"
        className="flex size-8 items-center justify-center rounded-full hover:bg-surface-secondary"
      >
        <Icon />
      </Disclosure.Trigger>
      <div onClick={() => go()} className="rounded-full p-1" />
      <Button className={cn("h-7 rounded-full px-2.5", "x")} onPress={go}>+1</Button>
      <button className="hover:rounded-full">y</button>
      <span className="size-2 rounded-full bg-success" />
      <Avatar className="rounded-full" />
      <Chip className="rounded-circle" />
      {/* shape-exempt: the account menu's trigger is the member's own face — a person */}
      <button className="rounded-full"><img alt="" /></button>
      <button className="rounded-full" /> {/* shape-exempt: */}
      <Button className="rounded-control">ok</Button>
      <Link className="rounded-full" href="/x">a link is pressed too</Link>
    </div>
  );
}
