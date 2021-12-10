import escapeHtml from './utils/escape-html.js';
import unescapeHtml from './utils/unescape-html.js';
import fetchJson from './utils/fetch-json.js';

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const BACKEND_URL = 'https://course-js.javascript.ru';

export default class ProductForm {
  element;
  subElements = {};
  apiCategoriesUrl = 'api/rest/categories';
  apiCategoriesParams = {
    '_sort': 'weight',
    '_refs': 'subcategory'
  };
  apiProductUrl = 'api/rest/products';
  defaultFormData = {
    title: '',
    description: '',
    quantity: 1,
    subcategory: '',
    status: 1,
    price: 100,
    discount: 0
  };
  fileElement;

  constructor (productId) {
    this.productId = productId;
  }

  async render () {
    const element = document.createElement('div');
    element.innerHTML = this.template;

    this.element = element.firstElementChild;
    this.subElements = this.getSubElements(this.element);

    const categoriesPromise = this.loadCategoriesData();

    const productPromise = this.productId
      ? this.loadProductData(this.productId)
      : Promise.resolve([this.defaultFormData]);

    const [categoriesData, productResponse] = await Promise.all([categoriesPromise, productPromise]);
    const [productData] = productResponse;

    this.fillCategories(categoriesData);
    this.fillForm(productData);

    this.addEventListeners();

    return this.element;
  }

  async loadProductData(id) {
    const url = new URL(this.apiProductUrl, BACKEND_URL);
    url.searchParams.set('id', id);

    const data = await fetchJson(url);

    return data;
  }

  async loadCategoriesData() {
    const url = new URL(this.apiCategoriesUrl, BACKEND_URL);

    for (const key in this.apiCategoriesParams) {
      url.searchParams.set(key, this.apiCategoriesParams[key]);
    }

    const data = await fetchJson(url);

    return data;
  }

  async save() {
    const product = this.getFromData();

    try {
      const result = await fetchJson(`${BACKEND_URL}/${this.apiProductUrl}`, {
        method: this.productId ? 'PATCH' : 'PUT',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify(product)
      });

      this.dispatchEvent(result.id);
    } catch (error) {
      console.error('Something went wrong :(', error);
    }
  }

  async uploadImage(file) {
    const formData = new FormData();

    formData.append('image', file);

    try {
      const response = await fetchJson('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
        },
        body: formData,
        referrer: ''
      });

      return response;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  get template() {
    return `
    <div class="product-form">
      <form data-element="productForm" class="form-grid">
        <div class="form-group form-group__half_left">
          <fieldset>
            <label class="form-label">Название товара</label>
            <input required="" type="text" name="title" id="title" class="form-control" placeholder="Название товара">
          </fieldset>
        </div>
        <div class="form-group form-group__wide">
          <label class="form-label">Описание</label>
          <textarea required="" class="form-control" name="description" id="description" data-element="productDescription" placeholder="Описание товара"></textarea>
        </div>
        <div class="form-group form-group__wide" data-element="sortable-list-container">
          <label class="form-label">Фото</label>
          <div data-element="imageListContainer">
            <ul class="sortable-list"></ul>
          </div>
          <button type="button" name="uploadImage" class="button-primary-outline"><span>Загрузить</span></button>
        </div>
        <div class="form-group form-group__half_left">
          <label class="form-label">Категория</label>
          <select class="form-control" name="subcategory" id="subcategory"></select>
        </div>
        <div class="form-group form-group__half_left form-group__two-col">
          <fieldset>
            <label class="form-label">Цена ($)</label>
            <input required="" type="number" name="price" id="price" class="form-control" placeholder="100">
          </fieldset>
          <fieldset>
            <label class="form-label">Скидка ($)</label>
            <input required="" type="number" name="discount" id="discount" class="form-control" placeholder="0">
          </fieldset>
        </div>
        <div class="form-group form-group__part-half">
          <label class="form-label">Количество</label>
          <input required="" type="number" class="form-control" name="quantity" id="quantity" placeholder="1">
        </div>
        <div class="form-group form-group__part-half">
          <label class="form-label">Статус</label>
          <select class="form-control" name="status" id="status">
            <option value="1">Активен</option>
            <option value="0">Неактивен</option>
          </select>
        </div>
        <div class="form-buttons">
          <button type="submit" name="save" class="button-primary-outline">
            ${this.productId ? 'Сохранить' : 'Добавить'} товар
          </button>
        </div>
      </form>
    </div>
    `;
  }

  fillCategories(data) {
    const select = this.subElements.productForm.querySelector('[name="subcategory"]');

    for (const item of data) {
      if (item.subcategories) {
        for (const subItem of item.subcategories) {
          select.add(new Option(`${item.title} > ${subItem.title}`, subItem.id));
        }
      } else {
        select.add(new Option(item.title, item.id));
      }
    }
  }

  fillForm(data) {
    const fields = Object.keys(this.defaultFormData);

    if (!this.productId) {
      data = this.defaultFormData;
    }

    for (const key of fields) {
      const value = data[key];
      this.subElements.productForm.querySelector(`#${key}`).value = typeof value === 'string' ? unescapeHtml(value) : value;
    }

    if (data.images) {
      this.subElements.imageListContainer.firstElementChild.innerHTML = this.renderImages(data.images);
    }
  }

  addEventListeners() {
    this.subElements.productForm.addEventListener('submit', this.onSubmitClick);
    this.subElements.imageListContainer.addEventListener('pointerdown', this.onPhotoDeleteClick);
    this.element.querySelector('[name="uploadImage"]').addEventListener('pointerdown', this.onUploadClick);
  }

  renderImages(images) {
    const result = images.map(image => {
      return this.getImageItem(image.url, image.source);
    });

    return result.join('');
  }

  getImageItem(url, source) {
    return `
        <li class="products-edit__imagelist-item sortable-list__item" style="">
          <input type="hidden" name="url" value="${url}">
          <input type="hidden" name="source" value="${source}">
          <span>
            <img src="icon-grab.svg" data-grab-handle="" alt="grab">
            <img class="sortable-table__cell-img" alt="Image" src="${url}">
            <span>${source}</span>
          </span>
          <button type="button">
            <img src="icon-trash.svg" data-delete-handle="" alt="delete">
          </button>
        </li>
      `;
  }

  getSubElements(element) {
    const result = {};
    const elements = element.querySelectorAll('[data-element]');

    for (const subElement of elements) {
      const name = subElement.dataset.element;

      result[name] = subElement;
    }

    return result;
  }

  onSubmitClick = async (event) => {
    event.preventDefault();

    this.save();
  }

  onUploadClick = (event) => {
    event.preventDefault();

    this.fileElement = document.createElement('input');
    this.fileElement.type = 'file';
    this.fileElement.accept = 'image/*';
    this.fileElement.hidden = true;

    this.element.append(this.fileElement);

    this.fileElement.click();

    this.fileElement.addEventListener('change', this.onFileChange);
  }

  onPhotoDeleteClick = (event) => {
    if (event.target.closest('button')) {
      event.target.closest('li').remove();
    }
  }

  onFileChange = async (event) => {
    const file = event.target.files[0];

    const data = await this.uploadImage(file);

    const container = document.createElement('div');
    container.innerHTML = this.getImageItem(data.data.link, file.name);
    this.subElements.imageListContainer.firstElementChild.appendChild(container.firstElementChild);

    this.fileElement.remove();
  }

  getFromData() {
    const result = {};
    const fields = Object.keys(this.defaultFormData);

    if (this.productId) {
      result.id = this.productId;
    }

    for (const key of fields) {
      const field = this.subElements.productForm.querySelector(`#${key}`);
      if (field.type === 'number' || key === 'status') {
        result[key] = parseFloat(field.value);
      } else {
        result[key] = escapeHtml(field.value);
      }
    }

    const images = this.subElements.imageListContainer.querySelectorAll('li');
    if (images.length) {
      result.images = [];
      for (const image of images) {
        result.images.push({
          source: image.querySelector('[name="source"]').value,
          url: image.querySelector('[name="url"]').value
        });
      }
    }

    return result;
  }

  dispatchEvent(id) {
    const event = this.productId
      ? new CustomEvent('product-updated', { detail: id })
      : new CustomEvent('product-saved');

    this.element.dispatchEvent(event);
  }

  remove() {
    if (this.element) {
      this.element.remove();
    }
  }

  destroy() {
    this.remove();
    this.element = null;
  }
}
