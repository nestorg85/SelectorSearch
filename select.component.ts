/**
 * For more info go to:
 * https://material.angular.io/guide/creating-a-custom-form-field-control
 */

import {AfterContentInit, Component, HostBinding, Input, OnDestroy, Optional, Self, ViewChild} from '@angular/core';
import {ControlValueAccessor, FormControl, NgControl} from '@angular/forms';
import {MatFormField, MatFormFieldControl} from "@angular/material/form-field";
import {BehaviorSubject, Subject, Subscription} from "rxjs";
import {coerceBooleanProperty} from "@angular/cdk/coercion";
import {MatSelect} from "@angular/material/select";
import {ObjectString} from "@core/models/general.model";
import {distinctUntilChanged} from "rxjs/operators";
import {touchedChanges} from "@core/utils/reactive-form.utils";

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  providers: [
    {provide: MatFormFieldControl, useExisting: SelectComponent, multi: true}
  ]
})
export class SelectComponent implements MatFormFieldControl<string>, ControlValueAccessor, AfterContentInit, OnDestroy {
  static nextId = 0;
  control: FormControl = new FormControl();
  stateChanges = new Subject<void>();
  @HostBinding() id = `app-select-${SelectComponent.nextId++}`;
  focused = false;
  touched = false;
  controlType = 'app-select-input';
  ariaDescribedby: string = ''
  @ViewChild('selectElement') elementRef: MatSelect | undefined;
  @Input() mainKey = 'id';
  selectFilterCtrl = new FormControl();
  filteredOptions$ = new BehaviorSubject<ObjectString[]>([]);
  subscriptions: Subscription[] = [];

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    @Optional() public parentFormField: MatFormField
  ) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  private _exclude: string[] = [];

  @Input()
  get exclude(): string[] {
    return this._exclude
  }

  set exclude(value: string[]) {
    this._exclude = value ?? [];
    this.filterOptions();
  }

  private _options: any[] = [];

  @Input()
  get options(): any[] {
    return this._options
  }

  set options(value: any[]) {
    this._options = value ?? [];
    this.filterOptions();
  }

  private _multiple: string | boolean = false

  @Input()
  get multiple(): string | boolean {
    return this._multiple;
  }

  set multiple(mul: string | boolean) {
    this._multiple = coerceBooleanProperty(mul);
    this.stateChanges.next();
  }

  @Input('aria-describedby')
  set userAriaDescribedBy(value: string) {
    this.ariaDescribedby = value
  }

  private _required = false;

  @Input()
  // @ts-ignore
  get required(): string | boolean {
    return this._required;
  }

  // @ts-ignore
  set required(req) {
    this._required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }

  get shouldLabelFloat() {
    return (this.focused || !this.empty) && !this.disabled;
  }

  get empty() {
    return !this.control.value;
  }

  private _placeholder: string = '';

  @Input()
  get placeholder() {
    return this._placeholder;
  }

  set placeholder(plh) {
    this._placeholder = plh;
    this.stateChanges.next();
  }

  get value(): string {
    return this.control.value;
  }

  set value(value: string) {
    if (value !== this.control.value) {
      this.control.setValue(value);
      this.onChange(value);
      this.onTouched();
      this.stateChanges.next();
    }
  }

  private _disabled = false;

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
    this._disabled ? this.control.disable() : this.control.enable();
    this.stateChanges.next();
  }

  get errorState(): boolean {
    return this.control.invalid && this.touched;
  }

  ngAfterContentInit(): void {
    if (this.ngControl?.control) {
      this.control = <FormControl>this.ngControl.control
      this.touched = this.control.touched

      this.subscriptions.push(
        touchedChanges(this.control).subscribe((touched) => {
          this.touched = touched
          this.stateChanges.next()
        })
      )
    }

    this.subscriptions.push(
      this.selectFilterCtrl.valueChanges
        .pipe(
          distinctUntilChanged()
        )
        .subscribe((value) => this.filterOptions())
    );
  }

  onContainerClick(event: MouseEvent) {
    if ((event.target as Element).tagName.toLowerCase() != 'input') {
      this.elementRef?.focus({preventScroll: true})
      this.elementRef?.open()
    }
  }

  setDescribedByIds(ids: string[]) {
    this.ariaDescribedby = ids.join(' ')
  }

  onFocusIn(event: FocusEvent) {
    if (!this.focused && !this._disabled) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onFocusOut(event: FocusEvent) {
    if (!this.elementRef?._elementRef.nativeElement.contains(event.relatedTarget as Element)) {
      this.touched = true;
      this.focused = false;
      this.onTouched();
      this.stateChanges.next();
    }
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  /**
   * Required for ControlValueAccessor implementation
   */
  onChange: any = () => {
  };

  /**
   * Required for ControlValueAccessor implementation
   */
  onTouched: any = () => {
  };

  /**
   * Required for ControlValueAccessor implementation
   * @param fn
   */
  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  /**
   * Required for ControlValueAccessor implementation
   * @param value
   */
  writeValue(value: string) {
    if (value) {
      this.value = value;
    } else if (value !== this.control.value) {
      this.control.reset(null);
    }
  }

  /**
   * Required for ControlValueAccessor implementation
   * @param fn
   */
  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  /**
   * Called when the formt control is disables from parent
   * @param isDisabled
   */
  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled
  }

  /**
   * Filter the options, according to the search control value
   * @private
   */
  private filterOptions(): void {
    if (!this.options) {
      return;
    }
    let search = this.selectFilterCtrl.value;
    if (!search) {
      if (this.exclude.length > 0) {
        this.filteredOptions$.next(
          this.options.filter(item => item.id === this.control?.value || !this.exclude.includes(item.id))
        );
      } else {
        this.filteredOptions$.next(this.options.slice());
      }
      return;
    } else {
      search = search.toLowerCase();
    }

    this.filteredOptions$.next(
      this.options.filter(item => item[this.mainKey].toLowerCase().indexOf(search) > -1 && !this.exclude.includes(item.id))
    );
  }

}
