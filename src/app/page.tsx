import { SimulationForm } from "@/components/SimulationForm";

export default function Home() {
  return (
    <>
      <div className="topbar">Simulador de consignado privado</div>
      <main className="container">
        <header className="hero">
          <h1>Simule seu crédito consignado</h1>
          <p>
            Preencha seus dados e compare, em poucos segundos, a avaliação de cada banco. Sem letras
            miúdas: você vê quem aprovou, quem recusou e quem não respondeu.
          </p>
        </header>
        <SimulationForm />
      </main>
      <footer className="footer">
        Projeto de demonstração criado para um desafio técnico. Todos os dados e bancos são fictícios e
        os resultados não representam oferta de crédito.
      </footer>
    </>
  );
}