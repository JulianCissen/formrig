import { Component, inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PageWrapperComponent } from '../../shared/page-wrapper/page-wrapper.component';

@Component({
  selector: 'app-create-form-page',
  standalone: true,
  imports: [PageWrapperComponent],
  template: `
    <app-page-wrapper title="New Form">
      <p>Form builder coming soon.</p>
    </app-page-wrapper>
  `,
})
export class CreateFormPage implements OnInit {
  private readonly titleService = inject(Title);

  ngOnInit(): void {
    this.titleService.setTitle('New Form – FormRig');
  }
}
