import { Component, inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PageWrapperComponent } from '../../shared/page-wrapper/page-wrapper.component';

@Component({
  selector: 'app-form-overview-page',
  standalone: true,
  imports: [PageWrapperComponent],
  template: `
    <app-page-wrapper title="Forms">
      <p>Your forms will appear here.</p>
    </app-page-wrapper>
  `,
})
export class FormOverviewPage implements OnInit {
  private readonly titleService = inject(Title);

  ngOnInit(): void {
    this.titleService.setTitle('Forms – FormRig');
  }
}
