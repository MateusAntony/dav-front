import {
  CardinalityOptions,
  DatabaseTypeOptions,
  RelationshipTypeOptions,
  type Diagram,
} from '~/src/interfaces/der-diagram';

export const diagramMock: Diagram = {
  id: 'diagram1',
  name: 'Company Management Diagram',
  entities: [
    {
      id: 'entity1',
      name: 'Employee',
      attrs: [
        { id: 'attr1', name: 'EmployeeID', type: DatabaseTypeOptions.UUID },
        { id: 'attr2', name: 'FirstName', type: DatabaseTypeOptions.VARCHAR },
        { id: 'attr3', name: 'LastName', type: DatabaseTypeOptions.VARCHAR },
        {
          id: 'attr4',
          name: 'DateOfBirth',
          type: DatabaseTypeOptions.TIMESTAMP,
        },
        { id: 'attr5', name: 'Salary', type: DatabaseTypeOptions.FLOAT },
      ],
      position: { x: null, y: null },
    },
    {
      id: 'entity2',
      name: 'Department',
      attrs: [
        { id: 'attr1', name: 'DepartmentID', type: DatabaseTypeOptions.UUID },
        {
          id: 'attr2',
          name: 'DepartmentName',
          type: DatabaseTypeOptions.VARCHAR,
        },
        { id: 'attr3', name: 'ManagerID', type: DatabaseTypeOptions.UUID },
      ],
      position: { x: null, y: null },
    },
    {
      id: 'entity3',
      name: 'Project',
      attrs: [
        { id: 'attr1', name: 'ProjectID', type: DatabaseTypeOptions.UUID },
        { id: 'attr2', name: 'ProjectName', type: DatabaseTypeOptions.VARCHAR },
        { id: 'attr3', name: 'Budget', type: DatabaseTypeOptions.DOUBLE },
      ],
      position: { x: null, y: null },
    },
    {
      id: 'entity4',
      name: 'Client',
      attrs: [
        { id: 'attr1', name: 'ClientID', type: DatabaseTypeOptions.UUID },
        { id: 'attr2', name: 'ClientName', type: DatabaseTypeOptions.VARCHAR },
        { id: 'attr3', name: 'ContactInfo', type: DatabaseTypeOptions.TEXT },
      ],
      position: { x: null, y: null },
    },
    {
      id: 'entity5',
      name: 'Task',
      attrs: [
        { id: 'attr1', name: 'TaskID', type: DatabaseTypeOptions.UUID },
        { id: 'attr2', name: 'TaskName', type: DatabaseTypeOptions.VARCHAR },
        { id: 'attr3', name: 'DueDate', type: DatabaseTypeOptions.TIMESTAMP },
        { id: 'attr4', name: 'Status', type: DatabaseTypeOptions.VARCHAR },
      ],
      position: { x: null, y: null },
    },
  ],
  relationships: [
    {
      id: 'relationship1',
      name: 'EmployeeDepartment',
      entityAId: 'entity1',
      entityBId: 'entity2',
      cardinality: CardinalityOptions.OneToMany,
      type: RelationshipTypeOptions.COMMON,
      position: { x: null, y: null },
    },
    {
      id: 'relationship3',
      name: 'ClientProject',
      entityAId: 'entity4',
      entityBId: 'entity3',
      cardinality: CardinalityOptions.OneToOne,
      type: RelationshipTypeOptions.INHERITANCE,
      position: { x: null, y: null },
    },
    {
      id: 'relationship4',
      name: 'ProjectTask',
      entityAId: 'entity3',
      entityBId: 'entity5',
      cardinality: CardinalityOptions.ManyToMany,
      type: RelationshipTypeOptions.ASSOCIATIVE,
      position: { x: null, y: null },
    },
    {
      id: 'relationship2',
      name: 'EmployeeProject',
      entityAId: 'entity1',
      entityBId: 'entity3',
      cardinality: CardinalityOptions.OneToOne,
      type: RelationshipTypeOptions.WEAK,
      position: { x: null, y: null },
    },
  ],
};
