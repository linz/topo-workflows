import { ApiObject, Chart } from 'cdk8s';
import { Construct } from 'constructs';

const DEFAULT_VALUE = 0;
const HIGH_VALUE = 10000000;
const VERY_HIGH_VALUE = 15000000;

class PriorityClassHigh extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new ApiObject(this, 'PriorityClass', {
      apiVersion: 'scheduling.k8s.io/v1',
      kind: 'PriorityClass',
      metadata: {
        name: 'high-priority',
      },
      value: HIGH_VALUE,
      globalDefault: false,
      description: 'A high priority class',
    });
  }
}

class PriorityClassVeryHigh extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new ApiObject(this, 'PriorityClass', {
      apiVersion: 'scheduling.k8s.io/v1',
      kind: 'PriorityClass',
      metadata: {
        name: 'very-high-priority',
      },
      value: VERY_HIGH_VALUE,
      globalDefault: false,
      description: 'A very high priority class',
    });
  }
}

class PriorityClassHighNoPreempt extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new ApiObject(this, 'PriorityClass', {
      apiVersion: 'scheduling.k8s.io/v1',
      kind: 'PriorityClass',
      metadata: {
        name: 'high-priority-no-preempt',
      },
      value: HIGH_VALUE,
      preemptionPolicy: 'Never',
      globalDefault: false,
      description: 'A high priority class without preemption',
    });
  }
}

class PriorityClassDefaultNoPreempt extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new ApiObject(this, 'PriorityClass', {
      apiVersion: 'scheduling.k8s.io/v1',
      kind: 'PriorityClass',
      metadata: {
        name: 'default-priority-no-preempt',
      },
      value: DEFAULT_VALUE,
      preemptionPolicy: 'Never',
      globalDefault: true,
      description: 'A default priority class without preemption',
    });
  }
}

export class PriorityClasses extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new PriorityClassVeryHigh(this, 'very-high-priority');
    new PriorityClassHigh(this, 'high-priority');
    new PriorityClassDefaultNoPreempt(this, 'default-priority-no-preempt');
    new PriorityClassHighNoPreempt(this, 'high-priority-no-preempt');
  }
}
