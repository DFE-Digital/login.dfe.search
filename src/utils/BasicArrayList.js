class BasicArrayList {
  constructor(preallocationSize) {
    this._array = new Array(preallocationSize);
    this._position = 0;
  }

  add(item) {
    const isArray = item instanceof Array;
    const requiredSpace = isArray ? item.length : 1;

    const availableSpace = this._array.length - this._position;
    if (requiredSpace > availableSpace) {
      throw new Error(`Insufficient space to add ${requiredSpace} items (Only ${availableSpace} available)`);
    }

    if (isArray) {
      item.forEach((arrayItem) => {
        this._array[this._position] = arrayItem;
        this._position += 1;
      });
    } else {
      this._array[this._position] = item;
      this._position += 1;
    }
  }

  get(index) {
    if (index >= this._position) {
      return undefined;
    }

    return this._array[index];
  }

  length() {
    return this._position;
  }

  toArray() {
    const array = new Array(this.length());
    for(let i = 0; i < this.length(); i+=1){
      array[i]=this._array[i];
    }
    return array;
  }

  toJSON() {
    return this.toArray();
  }
}

module.exports = BasicArrayList;