import { getMaterialName, isPdfMaterial, openPdfMaterial } from '../utils/scheduleUtils';

function MaterialsList({ materials, title }) {
  if (!materials?.length) {
    return <p className="modal__empty">לא הועלו חומרים.</p>;
  }

  return (
    <>
      {title && <p className="modal__subtitle">{title}</p>}
      <ul className="materials-list">
        {materials.map((item, index) => {
          const name = getMaterialName(item);
          const isPdf = isPdfMaterial(item);
          return (
            <li key={`${name}-${index}`}>
              <button
                type="button"
                className="materials-list__item"
                onClick={() => isPdf && openPdfMaterial(item)}
              >
                {isPdf ? '📕' : '📄'} {name}
                {isPdf && <span className="materials-list__tag">PDF</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default MaterialsList;
