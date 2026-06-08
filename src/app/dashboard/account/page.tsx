export default function AccountPage() {
  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1
        className="mb-1"
        style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.5px", color: "#0D1016" }}
      >
        Account
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "rgba(0,0,0,0.45)" }}>
        Gestisci i dati del tuo account e le preferenze personali.
      </p>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.5)" }}>
          Questa sezione è in fase di sviluppo. Presto potrai modificare email, password e dati aziendali.
        </p>
      </div>
    </div>
  );
}
