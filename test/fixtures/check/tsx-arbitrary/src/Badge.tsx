export function Badge() {
  return (
    <div>
      <span className="px-2 rounded-[5px]">new</span>
      {/* shape-exempt: a test cursor that mirrors the OS pointer */}
      <i className="rounded-tl-[3px]" />
      <b style={{ borderRadius: 2 }} /> {/* shape-exempt: */}
      <u className="md:rounded-b-[1px]" />
    </div>
  );
}
