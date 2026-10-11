import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Troca o ponto do POI por retângulo + âncora.
 *
 * A posição do ícone deixa de ser gravada e passa a ser **derivada** do retângulo
 * com a âncora (`poi-anchor.ts`). A coluna `position` sai porque guardar as três
 * deixaria o banco aceitar o estado que ninguém quis: um `position` que não
 * corresponde ao retângulo, que só apareceria quando alguém editasse o retângulo
 * por um caminho que não passa pelo utilitário.
 *
 * **O backfill preserva os pontos que já existiam.** Cada `position` vira um
 * retângulo pequeno, centrado no ponto, com a âncora no meio — ou seja, o ícone
 * continua exatamente onde estava e o retângulo aparece em volta dele. O lado
 * Default é 0,00002° (≈2 m), que é a menor caixa que ainda dá para arrastar e
 * redimensionar com o dedo. Perder a posição de um ponto já cadastrado seria
 * pior do que uma caixa pequena demais, que o organizador corrige puxando a
 * alça.
 *
 * O `position` só é derrubado no fim, depois do backfill: se algo der errado no
 * meio, a coluna ainda está lá para recuperar o ponto.
 */
export class AddPoiRect1730000006000 implements MigrationInterface {
  name = 'AddPoiRect1730000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" ADD "rect" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" ADD "anchor" jsonb`,
    );

    // `position` é `[latitude, longitude]`; o retângulo sai dos dois cantos em
    // volta do ponto e a âncora vai no meio.
    await queryRunner.query(`
      UPDATE "points_of_interest"
      SET
        "rect" = jsonb_build_object(
          'northEast', jsonb_build_array(
            (("position"->>0)::float8) + 0.00001,
            (("position"->>1)::float8) + 0.00001
          ),
          'southWest', jsonb_build_array(
            (("position"->>0)::float8) - 0.00001,
            (("position"->>1)::float8) - 0.00001
          )
        ),
        "anchor" = jsonb_build_object('u', 0.5, 'v', 0.5)
    `);

    await queryRunner.query(
      `ALTER TABLE "points_of_interest" ALTER COLUMN "rect" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" ALTER COLUMN "anchor" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "points_of_interest" DROP COLUMN "position"`,
    );
  }

  /**
   * O `position` volta, e cada POI recebe o centro do seu retângulo.
   *
   * A volta é lossy de propósito: quem tinha ícone fora do centro do retângulo
   * volta com o ícone no meio. Recuperar a âncora antiga exigiria manter a coluna
   * `anchor` na resposta, e desfazer a migration é operação de desenvolvimento,
   * não caminho de produção.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" ADD "position" jsonb`,
    );

    await queryRunner.query(`
      UPDATE "points_of_interest"
      SET "position" = jsonb_build_array(
        ((("rect"->'northEast'->>0)::float8) + (("rect"->'southWest'->>0)::float8)) / 2,
        ((("rect"->'northEast'->>1)::float8) + (("rect"->'southWest'->>1)::float8)) / 2
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "points_of_interest" ALTER COLUMN "position" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" DROP COLUMN "anchor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" DROP COLUMN "rect"`,
    );
  }
}
