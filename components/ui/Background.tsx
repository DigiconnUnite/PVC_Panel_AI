
export default function Background() {
    return (
      <>
    <div
      className="pointer-events-none  fixed inset-0 -z-10 h-full w-full"
      aria-hidden="true"
      style={{
        background:
          "linear-gradient(to bottom, #bfdbfe 0%, #fff 100%)",
      }}
    >
     
      </div>
       <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)",
          backgroundSize: "22px 22px", // Increased grid size
          pointerEvents: "none",
        }}
            />
        </>
  )
}
